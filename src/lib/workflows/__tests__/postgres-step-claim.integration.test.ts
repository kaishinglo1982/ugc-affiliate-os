import { randomUUID } from "node:crypto";

import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  PostgresWorkflowStepClaimService,
  WorkflowStepClaimLostError,
} from "@/lib/workflows/postgres-step-claim";

const databaseUrl = process.env.DATABASE_URL;
const integrationDescribe = databaseUrl ? describe : describe.skip;

integrationDescribe("PostgresWorkflowStepClaimService", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const service = new PostgresWorkflowStepClaimService(pool);
  const workspaceId = randomUUID();
  const workflowId = randomUUID();
  const workflowRunId = randomUUID();
  const stepDefinitionIds = [randomUUID(), randomUUID(), randomUUID()];
  const stepRunIds = [randomUUID(), randomUUID(), randomUUID()];

  beforeAll(async () => {
    await pool.query(
      `INSERT INTO "WorkflowDefinition"
        ("id", "workspaceId", "key", "version", "name", "trigger", "status", "enabled", "createdAt", "updatedAt")
       VALUES ($1, $2, 'phase-10-3-test', 1, 'Phase 10.3 test', 'manual', 'ACTIVE', true, NOW(), NOW())`,
      [workflowId, workspaceId],
    );

    await pool.query(
      `INSERT INTO "WorkflowRun"
        ("id", "workspaceId", "workflowId", "workflowVersion", "definitionSnapshot", "correlationId", "status", "startedAt")
       VALUES ($1, $2, $3, 1, '{}'::jsonb, $4, 'RUNNING', NOW())`,
      [workflowRunId, workspaceId, workflowId, randomUUID()],
    );

    for (let index = 0; index < stepDefinitionIds.length; index += 1) {
      await pool.query(
        `INSERT INTO "WorkflowStepDefinition"
          ("id", "workspaceId", "workflowId", "key", "dependsOn", "stepOrder", "type", "name")
         VALUES ($1, $2, $3, $4, ARRAY[]::text[], $5, 'AGENT', $6)`,
        [
          stepDefinitionIds[index],
          workspaceId,
          workflowId,
          `step-${index}`,
          index,
          `Step ${index}`,
        ],
      );

      await pool.query(
        `INSERT INTO "WorkflowStepRun"
          ("id", "workspaceId", "workflowRunId", "stepId", "status", "state", "attemptCount", "maxAttempts", "version", "startedAt")
         VALUES ($1, $2, $3, $4, 'RUNNING', 'READY', 0, 3, 0, NOW())`,
        [stepRunIds[index], workspaceId, workflowRunId, stepDefinitionIds[index]],
      );
    }
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM "WorkflowStepRun" WHERE "workflowRunId" = $1`, [workflowRunId]);
    await pool.query(`DELETE FROM "WorkflowStepDefinition" WHERE "workflowId" = $1`, [workflowId]);
    await pool.query(`DELETE FROM "WorkflowRun" WHERE "id" = $1`, [workflowRunId]);
    await pool.query(`DELETE FROM "WorkflowDefinition" WHERE "id" = $1`, [workflowId]);
    await pool.end();
  });

  it("allows concurrent workers to claim different steps exactly once", async () => {
    const now = new Date("2026-07-17T00:00:00.000Z");
    const [first, second] = await Promise.all([
      service.claimNext({ workspaceId, workerId: "worker-a", leaseMs: 60_000, now }),
      service.claimNext({ workspaceId, workerId: "worker-b", leaseMs: 60_000, now }),
    ]);

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first?.id).not.toBe(second?.id);
    expect(new Set([first?.claimedBy, second?.claimedBy])).toEqual(
      new Set(["worker-a", "worker-b"]),
    );
  });

  it("extends a valid lease and rejects stale claim tokens", async () => {
    const now = new Date("2026-07-17T00:01:00.000Z");
    const claim = await service.claimNext({
      workspaceId,
      workerId: "worker-heartbeat",
      leaseMs: 30_000,
      now,
    });

    expect(claim).not.toBeNull();
    if (!claim) throw new Error("Expected a claim.");

    await service.heartbeat({
      workspaceId,
      stepRunId: claim.id,
      claimToken: claim.claimToken,
      leaseMs: 60_000,
      now: new Date(now.getTime() + 10_000),
    });

    await expect(
      service.complete({
        workspaceId,
        stepRunId: claim.id,
        claimToken: "stale-token",
        now: new Date(now.getTime() + 20_000),
      }),
    ).rejects.toBeInstanceOf(WorkflowStepClaimLostError);

    await service.complete({
      workspaceId,
      stepRunId: claim.id,
      claimToken: claim.claimToken,
      output: { ok: true },
      now: new Date(now.getTime() + 20_000),
    });
  });

  it("requeues an expired claim and invalidates its old token", async () => {
    const fourthStepId = randomUUID();
    const fourthStepRunId = randomUUID();

    await pool.query(
      `INSERT INTO "WorkflowStepDefinition"
        ("id", "workspaceId", "workflowId", "key", "dependsOn", "stepOrder", "type", "name")
       VALUES ($1, $2, $3, $4, ARRAY[]::text[], 10, 'AGENT', 'Expired lease step')`,
      [fourthStepId, workspaceId, workflowId, `expired-${fourthStepId}`],
    );
    await pool.query(
      `INSERT INTO "WorkflowStepRun"
        ("id", "workspaceId", "workflowRunId", "stepId", "status", "state", "attemptCount", "maxAttempts", "version", "startedAt")
       VALUES ($1, $2, $3, $4, 'RUNNING', 'READY', 0, 3, 0, NOW())`,
      [fourthStepRunId, workspaceId, workflowRunId, fourthStepId],
    );

    const claimedAt = new Date("2026-07-17T00:02:00.000Z");
    const claim = await service.claimNext({
      workspaceId,
      workerId: "worker-expiring",
      leaseMs: 1_000,
      now: claimedAt,
    });
    expect(claim).not.toBeNull();
    if (!claim) throw new Error("Expected a claim.");

    expect(
      await service.releaseExpiredClaims({
        workspaceId,
        now: new Date(claimedAt.getTime() + 2_000),
      }),
    ).toBeGreaterThanOrEqual(1);

    await expect(
      service.complete({
        workspaceId,
        stepRunId: claim.id,
        claimToken: claim.claimToken,
        now: new Date(claimedAt.getTime() + 2_100),
      }),
    ).rejects.toBeInstanceOf(WorkflowStepClaimLostError);
  });
});
