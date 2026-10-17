import { randomUUID } from "node:crypto";

import type { Pool } from "pg";

import { withWorkspacePgTransaction } from "@/lib/db/workspace-pg-transaction";

import {
  type AgentTaskRequest,
  type RegisteredAgent,
  registeredAgentSchema,
} from "@/lib/agents/capability-registry";

export interface AgentCapacityReservation {
  reservationId: string;
  reservationToken: string;
  workflowStepRunId: string;
  expiresAt: Date;
  agent: RegisteredAgent;
}

export class NoAgentCapacityError extends Error {
  constructor(capabilityKey: string) {
    super(`No reservable agent capacity for capability ${capabilityKey}.`);
    this.name = "NoAgentCapacityError";
  }
}

export class PostgresAgentCapacityRouter {
  constructor(private readonly pool: Pool) {}

  async reserve(input: {
    request: AgentTaskRequest;
    workflowStepRunId: string;
    ttlMs: number;
    now?: Date;
  }): Promise<AgentCapacityReservation> {
    const now = input.now ?? new Date();
    const expiresAt = new Date(now.getTime() + input.ttlMs);
    const reservationId = randomUUID();
    const reservationToken = randomUUID();

    return withWorkspacePgTransaction(this.pool, input.request.workspaceId, async (client) => {
      const existing = await client.query<{
        reservationId: string;
        reservationToken: string;
        workflowStepRunId: string;
        expiresAt: Date;
        agent: unknown;
      }>(
        `SELECT r."id" AS "reservationId",
                r."reservationToken",
                r."workflowStepRunId",
                r."expiresAt",
                jsonb_build_object(
                  'workspaceId', a."workspaceId",
                  'agentKey', a."agentKey",
                  'version', a."version",
                  'enabled', a."enabled",
                  'health', a."health",
                  'capabilities', a."capabilities",
                  'allowedToolKeys', a."allowedToolKeys",
                  'providerKeys', a."providerKeys",
                  'currentLoad', a."currentLoad",
                  'maxConcurrency', a."maxConcurrency",
                  'estimatedCostPerTask', a."estimatedCostPerTask",
                  'averageLatencyMs', a."averageLatencyMs",
                  'successRate', a."successRate",
                  'priority', a."priority"
                ) AS agent
         FROM "AgentCapacityReservation" r
         JOIN "AgentCapabilityRegistration" a ON a."id" = r."agentRegistrationId"
         WHERE r."workspaceId" = $1
           AND r."workflowStepRunId" = $2
           AND r."status" = 'RESERVED'
           AND r."expiresAt" > $3
         FOR UPDATE`,
        [input.request.workspaceId, input.workflowStepRunId, now],
      );
      if (existing.rows[0]) {
        return {
          ...existing.rows[0],
          agent: registeredAgentSchema.parse(existing.rows[0].agent),
        };
      }

      const candidate = await client.query<{ id: string; agent: unknown }>(
        `SELECT a."id",
                jsonb_build_object(
                  'workspaceId', a."workspaceId",
                  'agentKey', a."agentKey",
                  'version', a."version",
                  'enabled', a."enabled",
                  'health', a."health",
                  'capabilities', a."capabilities",
                  'allowedToolKeys', a."allowedToolKeys",
                  'providerKeys', a."providerKeys",
                  'currentLoad', a."currentLoad",
                  'maxConcurrency', a."maxConcurrency",
                  'estimatedCostPerTask', a."estimatedCostPerTask",
                  'averageLatencyMs', a."averageLatencyMs",
                  'successRate', a."successRate",
                  'priority', a."priority"
                ) AS agent
         FROM "AgentCapabilityRegistration" a
         WHERE a."workspaceId" = $1
           AND a."enabled" = TRUE
           AND a."health" = 'ONLINE'
           AND a."currentLoad" < a."maxConcurrency"
           AND EXISTS (
             SELECT 1
             FROM jsonb_array_elements(a."capabilities") capability
             WHERE capability->>'key' = $2
               AND (capability->>'version')::INTEGER >= $3
           )
           AND a."allowedToolKeys" @> $4::TEXT[]
           AND a."providerKeys" @> $5::TEXT[]
         ORDER BY a."priority" DESC,
                  (a."currentLoad"::DOUBLE PRECISION / a."maxConcurrency") ASC,
                  a."agentKey" ASC,
                  a."version" DESC
         FOR UPDATE SKIP LOCKED
         LIMIT 1`,
        [
          input.request.workspaceId,
          input.request.capabilityKey,
          input.request.minimumCapabilityVersion ?? 1,
          input.request.requiredToolKeys ?? [],
          input.request.requiredProviderKeys ?? [],
        ],
      );

      const selected = candidate.rows[0];
      if (!selected) throw new NoAgentCapacityError(input.request.capabilityKey);

      await client.query(
        `UPDATE "AgentCapabilityRegistration"
         SET "currentLoad" = "currentLoad" + 1,
             "updatedAt" = $2
         WHERE "id" = $1
           AND "currentLoad" < "maxConcurrency"`,
        [selected.id, now],
      );

      await client.query(
        `INSERT INTO "AgentCapacityReservation" (
           "id", "workspaceId", "agentRegistrationId", "workflowStepRunId",
           "reservationToken", "status", "expiresAt", "createdAt"
         ) VALUES ($1, $2, $3, $4, $5, 'RESERVED', $6, $7)`,
        [reservationId, input.request.workspaceId, selected.id, input.workflowStepRunId, reservationToken, expiresAt, now],
      );

      return {
        reservationId,
        reservationToken,
        workflowStepRunId: input.workflowStepRunId,
        expiresAt,
        agent: registeredAgentSchema.parse(selected.agent),
      };
    });
  }

  async release(input: {
    workspaceId: string;
    reservationToken: string;
    now?: Date;
  }): Promise<boolean> {
    const now = input.now ?? new Date();
    return withWorkspacePgTransaction(this.pool, input.workspaceId, async (client) => {
      const result = await client.query<{ agentRegistrationId: string }>(
        `UPDATE "AgentCapacityReservation"
         SET "status" = 'RELEASED', "releasedAt" = $3
         WHERE "workspaceId" = $1
           AND "reservationToken" = $2
           AND "status" = 'RESERVED'
         RETURNING "agentRegistrationId"`,
        [input.workspaceId, input.reservationToken, now],
      );
      const row = result.rows[0];
      if (!row) return false;

      await client.query(
        `UPDATE "AgentCapabilityRegistration"
         SET "currentLoad" = GREATEST("currentLoad" - 1, 0),
             "updatedAt" = $2
         WHERE "id" = $1`,
        [row.agentRegistrationId, now],
      );
      return true;
    });
  }

  async releaseExpired(input: { workspaceId: string; now?: Date }): Promise<number> {
    const now = input.now ?? new Date();
    return withWorkspacePgTransaction(this.pool, input.workspaceId, async (client) => {
      const expired = await client.query<{ agentRegistrationId: string }>(
        `UPDATE "AgentCapacityReservation"
         SET "status" = 'EXPIRED', "releasedAt" = $2
         WHERE "workspaceId" = $1
           AND "status" = 'RESERVED'
           AND "expiresAt" <= $2
         RETURNING "agentRegistrationId"`,
        [input.workspaceId, now],
      );
      for (const row of expired.rows) {
        await client.query(
          `UPDATE "AgentCapabilityRegistration"
           SET "currentLoad" = GREATEST("currentLoad" - 1, 0),
               "updatedAt" = $2
           WHERE "id" = $1`,
          [row.agentRegistrationId, now],
        );
      }
      return expired.rowCount ?? 0;
    });
  }
}
