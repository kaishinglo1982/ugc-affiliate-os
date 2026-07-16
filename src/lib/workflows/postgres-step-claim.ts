import { randomUUID } from "node:crypto";

import type { Pool, PoolClient } from "pg";

export interface ClaimedWorkflowStep {
  id: string;
  workspaceId: string;
  workflowRunId: string;
  stepId: string;
  claimToken: string;
  claimedBy: string;
  leaseExpiresAt: Date;
  attemptCount: number;
  maxAttempts: number;
  version: number;
}

export class WorkflowStepClaimLostError extends Error {
  constructor(stepRunId: string) {
    super(`Workflow step claim for ${stepRunId} is no longer valid.`);
    this.name = "WorkflowStepClaimLostError";
  }
}

async function inTransaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export class PostgresWorkflowStepClaimService {
  constructor(private readonly pool: Pool) {}

  async claimNext(input: {
    workspaceId: string;
    workerId: string;
    leaseMs: number;
    now?: Date;
  }): Promise<ClaimedWorkflowStep | null> {
    const now = input.now ?? new Date();
    const leaseExpiresAt = new Date(now.getTime() + input.leaseMs);
    const claimToken = randomUUID();

    return inTransaction(this.pool, async (client) => {
      const result = await client.query<ClaimedWorkflowStep>(
        `WITH candidate AS (
           SELECT "id"
           FROM "WorkflowStepRun"
           WHERE "workspaceId" = $1
             AND "state" IN ('READY', 'RETRYING')
             AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= $2)
             AND ("leaseExpiresAt" IS NULL OR "leaseExpiresAt" <= $2)
             AND "attemptCount" < "maxAttempts"
           ORDER BY "startedAt" ASC, "id" ASC
           FOR UPDATE SKIP LOCKED
           LIMIT 1
         )
         UPDATE "WorkflowStepRun" AS step
         SET "state" = 'CLAIMED',
             "claimedBy" = $3,
             "claimToken" = $4,
             "leaseExpiresAt" = $5,
             "heartbeatAt" = $2,
             "attemptCount" = step."attemptCount" + 1,
             "version" = step."version" + 1
         FROM candidate
         WHERE step."id" = candidate."id"
         RETURNING step."id",
                   step."workspaceId",
                   step."workflowRunId",
                   step."stepId",
                   step."claimToken",
                   step."claimedBy",
                   step."leaseExpiresAt",
                   step."attemptCount",
                   step."maxAttempts",
                   step."version"`,
        [input.workspaceId, now, input.workerId, claimToken, leaseExpiresAt],
      );

      return result.rows[0] ?? null;
    });
  }

  async heartbeat(input: {
    workspaceId: string;
    stepRunId: string;
    claimToken: string;
    leaseMs: number;
    now?: Date;
  }): Promise<void> {
    const now = input.now ?? new Date();
    const leaseExpiresAt = new Date(now.getTime() + input.leaseMs);
    const result = await this.pool.query(
      `UPDATE "WorkflowStepRun"
       SET "heartbeatAt" = $4,
           "leaseExpiresAt" = $5,
           "version" = "version" + 1
       WHERE "workspaceId" = $1
         AND "id" = $2
         AND "claimToken" = $3
         AND "state" IN ('CLAIMED', 'RUNNING')
         AND "leaseExpiresAt" > $4`,
      [input.workspaceId, input.stepRunId, input.claimToken, now, leaseExpiresAt],
    );
    if (result.rowCount !== 1) throw new WorkflowStepClaimLostError(input.stepRunId);
  }

  async complete(input: {
    workspaceId: string;
    stepRunId: string;
    claimToken: string;
    output?: unknown;
    now?: Date;
  }): Promise<void> {
    const now = input.now ?? new Date();
    const result = await this.pool.query(
      `UPDATE "WorkflowStepRun"
       SET "state" = 'COMPLETED',
           "status" = 'COMPLETED',
           "output" = $4::jsonb,
           "finishedAt" = $5,
           "claimedBy" = NULL,
           "claimToken" = NULL,
           "leaseExpiresAt" = NULL,
           "version" = "version" + 1
       WHERE "workspaceId" = $1
         AND "id" = $2
         AND "claimToken" = $3
         AND "state" IN ('CLAIMED', 'RUNNING')
         AND "leaseExpiresAt" > $5`,
      [input.workspaceId, input.stepRunId, input.claimToken, JSON.stringify(input.output ?? null), now],
    );
    if (result.rowCount !== 1) throw new WorkflowStepClaimLostError(input.stepRunId);
  }

  async releaseExpiredClaims(input: { workspaceId: string; now?: Date }): Promise<number> {
    const now = input.now ?? new Date();
    const result = await this.pool.query(
      `UPDATE "WorkflowStepRun"
       SET "state" = CASE WHEN "attemptCount" >= "maxAttempts" THEN 'FAILED' ELSE 'READY' END,
           "status" = CASE WHEN "attemptCount" >= "maxAttempts" THEN 'FAILED' ELSE "status" END,
           "claimedBy" = NULL,
           "claimToken" = NULL,
           "leaseExpiresAt" = NULL,
           "heartbeatAt" = NULL,
           "version" = "version" + 1
       WHERE "workspaceId" = $1
         AND "state" IN ('CLAIMED', 'RUNNING')
         AND "leaseExpiresAt" <= $2`,
      [input.workspaceId, now],
    );
    return result.rowCount ?? 0;
  }
}
