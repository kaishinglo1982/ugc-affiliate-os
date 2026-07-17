import { randomUUID } from "node:crypto";

import { Pool } from "pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  ApprovalDecisionReplayError,
  ApprovalExpiredError,
  ApprovalFourEyesViolationError,
  PostgresApprovalGateService,
  WorkflowStepNotRunningError,
} from "@/lib/workflows/approval-gate";

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb("PostgresApprovalGateService", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const gate = new PostgresApprovalGateService(pool);

  let workspaceId = "";
  let workflowId = "";
  let workflowRunId = "";
  let stepRunId = "";
  let secondStepRunId = "";

  async function createRunWithSteps(stepCount: 1 | 2): Promise<void> {
    workspaceId = randomUUID();
    workflowId = randomUUID();
    workflowRunId = randomUUID();
    const stepDefIds = [randomUUID(), randomUUID()];
    const stepRunIds = [randomUUID(), randomUUID()];

    await pool.query(
      `INSERT INTO "WorkflowDefinition"
        ("id", "workspaceId", "key", "version", "name", "trigger", "status", "enabled", "createdAt", "updatedAt")
       VALUES ($1, $2, 'phase-10-6-test', 1, 'Phase 10.6 test', 'manual', 'ACTIVE', true, NOW(), NOW())`,
      [workflowId, workspaceId],
    );
    await pool.query(
      `INSERT INTO "WorkflowRun"
        ("id", "workspaceId", "workflowId", "workflowVersion", "definitionSnapshot", "correlationId", "status", "startedAt")
       VALUES ($1, $2, $3, 1, '{}'::jsonb, $4, 'RUNNING', NOW())`,
      [workflowRunId, workspaceId, workflowId, randomUUID()],
    );

    for (let index = 0; index < stepCount; index += 1) {
      await pool.query(
        `INSERT INTO "WorkflowStepDefinition"
          ("id", "workspaceId", "workflowId", "key", "dependsOn", "stepOrder", "type", "name")
         VALUES ($1, $2, $3, $4, ARRAY[]::text[], $5, 'APPROVAL', $6)`,
        [stepDefIds[index], workspaceId, workflowId, `step-${index}`, index, `Step ${index}`],
      );
      await pool.query(
        `INSERT INTO "WorkflowStepRun"
          ("id", "workspaceId", "workflowRunId", "stepId", "status", "state", "attemptCount", "maxAttempts", "version", "startedAt")
         VALUES ($1, $2, $3, $4, 'RUNNING', 'RUNNING', 0, 3, 0, NOW())`,
        [stepRunIds[index], workspaceId, workflowRunId, stepDefIds[index]],
      );
    }
    stepRunId = stepRunIds[0];
    secondStepRunId = stepRunIds[1];
  }

  beforeEach(async () => {
    await createRunWithSteps(1);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("requests an approval and pauses the step and run", async () => {
    const { approval, created } = await gate.requestApprovalForStep({
      workspaceId,
      workflowStepRunId: stepRunId,
      resourceType: "product_campaign_candidate",
      resourceId: randomUUID(),
      requestedBy: "requester-a",
    });
    expect(created).toBe(true);
    expect(approval.status).toBe("PENDING");

    const step = await pool.query(`SELECT "state", "approvalId" FROM "WorkflowStepRun" WHERE "id" = $1`, [stepRunId]);
    expect(step.rows[0].state).toBe("WAITING_FOR_APPROVAL");
    expect(step.rows[0].approvalId).toBe(approval.id);

    const run = await pool.query(`SELECT "status" FROM "WorkflowRun" WHERE "id" = $1`, [workflowRunId]);
    expect(run.rows[0].status).toBe("WAITING_FOR_APPROVAL");
  });

  it("is idempotent when requested twice for the same waiting step", async () => {
    const first = await gate.requestApprovalForStep({
      workspaceId,
      workflowStepRunId: stepRunId,
      resourceType: "product_campaign_candidate",
      resourceId: randomUUID(),
      requestedBy: "requester-a",
    });
    const second = await gate.requestApprovalForStep({
      workspaceId,
      workflowStepRunId: stepRunId,
      resourceType: "product_campaign_candidate",
      resourceId: randomUUID(),
      requestedBy: "requester-a",
    });
    expect(second.created).toBe(false);
    expect(second.approval.id).toBe(first.approval.id);
  });

  it("refuses to request approval for a step that is not RUNNING", async () => {
    await pool.query(`UPDATE "WorkflowStepRun" SET "state" = 'READY' WHERE "id" = $1`, [stepRunId]);
    await expect(
      gate.requestApprovalForStep({
        workspaceId,
        workflowStepRunId: stepRunId,
        resourceType: "product_campaign_candidate",
        resourceId: randomUUID(),
        requestedBy: "requester-a",
      }),
    ).rejects.toBeInstanceOf(WorkflowStepNotRunningError);
  });

  it("approves and resumes the step to READY and the run to RUNNING", async () => {
    const { approval } = await gate.requestApprovalForStep({
      workspaceId,
      workflowStepRunId: stepRunId,
      resourceType: "product_campaign_candidate",
      resourceId: randomUUID(),
      requestedBy: "requester-a",
    });

    const result = await gate.decideApproval({
      workspaceId,
      approvalId: approval.id,
      decision: "APPROVED",
      decidedBy: "decider-b",
    });

    expect(result.resumedStep).toEqual({ id: stepRunId, state: "READY" });
    expect(result.resumedRun).toEqual({ id: workflowRunId, status: "RUNNING" });

    const run = await pool.query(`SELECT "status" FROM "WorkflowRun" WHERE "id" = $1`, [workflowRunId]);
    expect(run.rows[0].status).toBe("RUNNING");
  });

  it("does not resume the run while another step is still waiting", async () => {
    await createRunWithSteps(2);
    const { approval } = await gate.requestApprovalForStep({
      workspaceId,
      workflowStepRunId: stepRunId,
      resourceType: "product_campaign_candidate",
      resourceId: randomUUID(),
      requestedBy: "requester-a",
    });
    await gate.requestApprovalForStep({
      workspaceId,
      workflowStepRunId: secondStepRunId,
      resourceType: "product_campaign_candidate",
      resourceId: randomUUID(),
      requestedBy: "requester-a",
    });

    const result = await gate.decideApproval({
      workspaceId,
      approvalId: approval.id,
      decision: "APPROVED",
      decidedBy: "decider-b",
    });

    expect(result.resumedStep).toEqual({ id: stepRunId, state: "READY" });
    expect(result.resumedRun).toBeNull();

    const run = await pool.query(`SELECT "status" FROM "WorkflowRun" WHERE "id" = $1`, [workflowRunId]);
    expect(run.rows[0].status).toBe("WAITING_FOR_APPROVAL");
  });

  it("rejects and fails the step and the run", async () => {
    const { approval } = await gate.requestApprovalForStep({
      workspaceId,
      workflowStepRunId: stepRunId,
      resourceType: "product_campaign_candidate",
      resourceId: randomUUID(),
      requestedBy: "requester-a",
    });

    const result = await gate.decideApproval({
      workspaceId,
      approvalId: approval.id,
      decision: "REJECTED",
      decidedBy: "decider-b",
      decisionReason: "not aligned with brand guidelines",
    });

    expect(result.resumedStep).toEqual({ id: stepRunId, state: "FAILED" });
    expect(result.resumedRun).toEqual({ id: workflowRunId, status: "FAILED" });
  });

  it("cannot be decided twice (no replay)", async () => {
    const { approval } = await gate.requestApprovalForStep({
      workspaceId,
      workflowStepRunId: stepRunId,
      resourceType: "product_campaign_candidate",
      resourceId: randomUUID(),
      requestedBy: "requester-a",
    });
    await gate.decideApproval({
      workspaceId,
      approvalId: approval.id,
      decision: "APPROVED",
      decidedBy: "decider-b",
    });

    await expect(
      gate.decideApproval({
        workspaceId,
        approvalId: approval.id,
        decision: "REJECTED",
        decidedBy: "decider-c",
      }),
    ).rejects.toBeInstanceOf(ApprovalDecisionReplayError);
  });

  it("enforces four-eyes: the requester cannot decide their own approval", async () => {
    const { approval } = await gate.requestApprovalForStep({
      workspaceId,
      workflowStepRunId: stepRunId,
      resourceType: "product_campaign_candidate",
      resourceId: randomUUID(),
      requestedBy: "same-actor",
    });

    await expect(
      gate.decideApproval({
        workspaceId,
        approvalId: approval.id,
        decision: "APPROVED",
        decidedBy: "same-actor",
      }),
    ).rejects.toBeInstanceOf(ApprovalFourEyesViolationError);
  });

  it("denies deciding an expired approval", async () => {
    const { approval } = await gate.requestApprovalForStep({
      workspaceId,
      workflowStepRunId: stepRunId,
      resourceType: "product_campaign_candidate",
      resourceId: randomUUID(),
      requestedBy: "requester-a",
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    await expect(
      gate.decideApproval({
        workspaceId,
        approvalId: approval.id,
        decision: "APPROVED",
        decidedBy: "decider-b",
        now: new Date("2026-06-01T00:00:00.000Z"),
      }),
    ).rejects.toBeInstanceOf(ApprovalExpiredError);
  });
});
