import type { PoolClient, QueryResultRow } from "pg";

import { withWorkspacePgTransaction } from "@/lib/db/workspace-pg-transaction";

import type {
  PersistedWorkflowDefinition,
  PersistedWorkflowRun,
  WorkflowPersistenceAdapter,
} from "@/lib/workflows/repository";
import type { WorkflowDefinitionInput } from "@/lib/workflows/validation";

export interface WorkflowPostgresPool {
  connect(): Promise<PoolClient>;
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[]; rowCount: number | null }>;
}

interface DefinitionRow extends QueryResultRow {
  id: string;
  workspaceId: string;
  key: string;
  version: number;
  name: string;
  description: string | null;
  trigger: string;
  scheduleCron: string | null;
  status: WorkflowDefinitionInput["status"];
  config: Record<string, unknown> | null;
  definitionHash: string;
  activatedAt: Date | null;
  supersededAt: Date | null;
  steps: WorkflowDefinitionInput["steps"];
}

interface RunRow extends QueryResultRow {
  id: string;
  workspaceId: string;
  workflowId: string;
  workflowVersion: number;
  definitionSnapshot: WorkflowDefinitionInput;
  definitionHash: string;
  correlationId: string;
  idempotencyKey: string | null;
}

function mapDefinition(row: DefinitionRow): PersistedWorkflowDefinition {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    definition: {
      key: row.key,
      name: row.name,
      ...(row.description ? { description: row.description } : {}),
      version: row.version,
      status: row.status,
      trigger: row.trigger,
      ...(row.scheduleCron ? { scheduleCron: row.scheduleCron } : {}),
      steps: row.steps,
      metadata: row.config ?? {},
    },
    definitionHash: row.definitionHash,
    activatedAt: row.activatedAt,
    supersededAt: row.supersededAt,
  };
}

function mapRun(row: RunRow): PersistedWorkflowRun {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    workflowId: row.workflowId,
    workflowVersion: row.workflowVersion,
    definitionSnapshot: row.definitionSnapshot,
    definitionHash: row.definitionHash,
    correlationId: row.correlationId,
    idempotencyKey: row.idempotencyKey,
  };
}

const definitionSelect = `
  SELECT
    d."id", d."workspaceId", d."key", d."version", d."name",
    d."description", d."trigger", d."scheduleCron", d."status",
    d."config", d."definitionHash", d."activatedAt", d."supersededAt",
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'key', s."key",
          'name', s."name",
          'type', s."type",
          'order', s."stepOrder",
          'dependsOn', s."dependsOn",
          'config', COALESCE(s."config", '{}'::jsonb)
        ) ORDER BY s."stepOrder"
      ) FILTER (WHERE s."id" IS NOT NULL),
      '[]'::jsonb
    ) AS "steps"
  FROM "WorkflowDefinition" d
  LEFT JOIN "WorkflowStepDefinition" s ON s."workflowId" = d."id"
`;

export class PostgresWorkflowPersistenceAdapter
  implements WorkflowPersistenceAdapter
{
  constructor(private readonly pool: WorkflowPostgresPool) {}

  async findDefinition(input: {
    workspaceId: string;
    key: string;
    version: number;
  }): Promise<PersistedWorkflowDefinition | null> {
    const result = await withWorkspacePgTransaction(this.pool, input.workspaceId, async (client) => client.query<DefinitionRow>(
      `${definitionSelect}
       WHERE d."workspaceId" = $1 AND d."key" = $2 AND d."version" = $3
       GROUP BY d."id"`,
      [input.workspaceId, input.key, input.version],
    ));
    return result.rows[0] ? mapDefinition(result.rows[0]) : null;
  }

  async createDefinition(input: {
    workspaceId: string;
    definition: WorkflowDefinitionInput;
    definitionHash: string;
  }): Promise<PersistedWorkflowDefinition> {
    await withWorkspacePgTransaction(this.pool, input.workspaceId, async (client) => {
      const created = await client.query<{ id: string }>(
        `INSERT INTO "WorkflowDefinition"
          ("id", "workspaceId", "key", "version", "name", "description",
           "trigger", "scheduleCron", "status", "enabled", "config",
           "definitionHash", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, false, $9::jsonb, $10, NOW(), NOW())
         RETURNING "id"`,
        [
          input.workspaceId,
          input.definition.key,
          input.definition.version,
          input.definition.name,
          input.definition.description ?? null,
          input.definition.trigger,
          input.definition.scheduleCron ?? null,
          input.definition.status,
          JSON.stringify(input.definition.metadata),
          input.definitionHash,
        ],
      );
      const workflowId = created.rows[0]?.id;
      if (!workflowId) throw new Error("Workflow definition insert returned no id.");

      for (const step of input.definition.steps) {
        await client.query(
          `INSERT INTO "WorkflowStepDefinition"
            ("id", "workspaceId", "workflowId", "key", "stepOrder", "type", "name", "dependsOn", "config")
           VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
          [
            input.workspaceId,
            workflowId,
            step.key,
            step.order,
            step.type,
            step.name,
            step.dependsOn,
            JSON.stringify(step.config),
          ],
        );
      }
    });

    const persisted = await this.findDefinition({
      workspaceId: input.workspaceId,
      key: input.definition.key,
      version: input.definition.version,
    });
    if (!persisted) throw new Error("Created workflow definition could not be reloaded.");
    return persisted;
  }

  async activateDefinition(input: {
    workspaceId: string;
    workflowId: string;
    expectedVersion: number;
    activatedAt: Date;
  }): Promise<PersistedWorkflowDefinition> {
    const key = await withWorkspacePgTransaction(this.pool, input.workspaceId, async (client) => {
      const target = await client.query<{ key: string; version: number }>(
        `SELECT "key", "version" FROM "WorkflowDefinition"
         WHERE "id" = $1 AND "workspaceId" = $2
         FOR UPDATE`,
        [input.workflowId, input.workspaceId],
      );
      const row = target.rows[0];
      if (!row || row.version !== input.expectedVersion) {
        throw new Error("Workflow activation version conflict.");
      }

      await client.query(
        `UPDATE "WorkflowDefinition"
         SET "status" = 'PAUSED', "enabled" = false, "supersededAt" = $1, "updatedAt" = NOW()
         WHERE "workspaceId" = $2 AND "key" = $3 AND "status" = 'ACTIVE' AND "id" <> $4`,
        [input.activatedAt, input.workspaceId, row.key, input.workflowId],
      );
      await client.query(
        `UPDATE "WorkflowDefinition"
         SET "status" = 'ACTIVE', "enabled" = true, "activatedAt" = $1,
             "supersededAt" = NULL, "updatedAt" = NOW()
         WHERE "id" = $2 AND "workspaceId" = $3 AND "version" = $4`,
        [input.activatedAt, input.workflowId, input.workspaceId, input.expectedVersion],
      );
      return row.key;
    });

    const activated = await this.findDefinition({
      workspaceId: input.workspaceId,
      key,
      version: input.expectedVersion,
    });
    if (!activated) throw new Error("Activated workflow definition could not be reloaded.");
    return activated;
  }

  async createRun(input: {
    workspaceId: string;
    workflowId: string;
    workflowVersion: number;
    definitionSnapshot: WorkflowDefinitionInput;
    definitionHash: string;
    correlationId: string;
    idempotencyKey: string | null;
  }): Promise<PersistedWorkflowRun> {
    const result = await withWorkspacePgTransaction(this.pool, input.workspaceId, async (client) => client.query<RunRow>(
      `INSERT INTO "WorkflowRun"
        ("id", "workspaceId", "workflowId", "workflowVersion", "definitionSnapshot",
         "definitionHash", "correlationId", "idempotencyKey", "status", "startedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4::jsonb, $5, $6, $7, 'RUNNING', NOW())
       ON CONFLICT ("workspaceId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL
       DO UPDATE SET "idempotencyKey" = EXCLUDED."idempotencyKey"
       RETURNING "id", "workspaceId", "workflowId", "workflowVersion",
                 "definitionSnapshot", "definitionHash", "correlationId", "idempotencyKey"`,
      [
        input.workspaceId,
        input.workflowId,
        input.workflowVersion,
        JSON.stringify(input.definitionSnapshot),
        input.definitionHash,
        input.correlationId,
        input.idempotencyKey,
      ],
    ));
    const row = result.rows[0];
    if (!row) throw new Error("Workflow run insert returned no row.");
    return mapRun(row);
  }

  async findRunByIdempotencyKey(input: {
    workspaceId: string;
    idempotencyKey: string;
  }): Promise<PersistedWorkflowRun | null> {
    const result = await withWorkspacePgTransaction(this.pool, input.workspaceId, async (client) => client.query<RunRow>(
      `SELECT "id", "workspaceId", "workflowId", "workflowVersion",
              "definitionSnapshot", "definitionHash", "correlationId", "idempotencyKey"
       FROM "WorkflowRun"
       WHERE "workspaceId" = $1 AND "idempotencyKey" = $2`,
      [input.workspaceId, input.idempotencyKey],
    ));
    return result.rows[0] ? mapRun(result.rows[0]) : null;
  }
}
