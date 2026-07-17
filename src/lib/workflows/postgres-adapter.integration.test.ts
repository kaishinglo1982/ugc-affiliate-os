import { randomUUID } from "node:crypto";

import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PostgresWorkflowPersistenceAdapter } from "@/lib/workflows/postgres-adapter";
import { WorkflowRepositoryService } from "@/lib/workflows/repository";

const databaseUrl = process.env.DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase("PostgresWorkflowPersistenceAdapter", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const workspaceId = randomUUID();
  const workflowKey = `phase-10-2-${randomUUID()}`;
  const service = new WorkflowRepositoryService(
    new PostgresWorkflowPersistenceAdapter(pool),
  );

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  afterAll(async () => {
    await pool.query(
      `DELETE FROM "WorkflowRun" WHERE "workspaceId" = $1`,
      [workspaceId],
    );
    await pool.query(
      `DELETE FROM "WorkflowDefinition" WHERE "workspaceId" = $1`,
      [workspaceId],
    );
    await pool.end();
  });

  it("creates, activates and starts an immutable versioned workflow run", async () => {
    const definition = await service.createVersion({
      workspaceId,
      definition: {
        key: workflowKey,
        name: "Phase 10.2 integration workflow",
        version: 1,
        status: "DRAFT",
        trigger: "manual",
        steps: [
          {
            key: "research",
            name: "Research",
            type: "AGENT",
            order: 0,
            dependsOn: [],
            config: {},
          },
          {
            key: "approval",
            name: "Approval",
            type: "APPROVAL",
            order: 1,
            dependsOn: ["research"],
            config: { resourceType: "product" },
          },
        ],
        metadata: { source: "integration-test" },
      },
    });

    const activated = await service.activateVersion({
      workspaceId,
      workflowId: definition.id,
      expectedVersion: 1,
    });
    expect(activated.definition.status).toBe("ACTIVE");
    expect(activated.activatedAt).toBeInstanceOf(Date);

    const firstRun = await service.startRun({
      workspaceId,
      definition: activated,
      idempotencyKey: "same-request",
      correlationId: randomUUID(),
    });
    const replay = await service.startRun({
      workspaceId,
      definition: activated,
      idempotencyKey: "same-request",
      correlationId: randomUUID(),
    });

    expect(replay.id).toBe(firstRun.id);
    expect(firstRun.workflowVersion).toBe(1);
    expect(firstRun.definitionSnapshot).toEqual(activated.definition);
    expect(firstRun.definitionHash).toBe(activated.definitionHash);
  });

  it("keeps workflow versions isolated by workspace", async () => {
    const foreignWorkspaceId = randomUUID();
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM "WorkflowDefinition"
       WHERE "workspaceId" = $1 AND "key" = $2`,
      [foreignWorkspaceId, workflowKey],
    );
    expect(result.rows[0]?.count).toBe(0);
  });
});
