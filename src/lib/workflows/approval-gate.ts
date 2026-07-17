import { randomUUID } from "node:crypto";

import type { Pool, PoolClient } from "pg";

import type { ApprovalResourceType } from "@/generated/prisma/client";

export type ApprovalDecision = "APPROVED" | "REJECTED";

export class ApprovalNotFoundError extends Error {
  constructor(approvalId: string) {
    super(`Approval ${approvalId} not found.`);
    this.name = "ApprovalNotFoundError";
  }
}

export class ApprovalDecisionReplayError extends Error {
  constructor(approvalId: string, status: string) {
    super(`Approval ${approvalId} is already ${status} and cannot be decided again.`);
    this.name = "ApprovalDecisionReplayError";
  }
}

export class ApprovalExpiredError extends Error {
  constructor(approvalId: string) {
    super(`Approval ${approvalId} has expired and can no longer be decided.`);
    this.name = "ApprovalExpiredError";
  }
}

export class ApprovalFourEyesViolationError extends Error {
  constructor(approvalId: string) {
    super(`Approval ${approvalId} cannot be decided by the same actor who requested it.`);
    this.name = "ApprovalFourEyesViolationError";
  }
}

export class WorkflowStepNotFoundError extends Error {
  constructor(workflowStepRunId: string) {
    super(`Workflow step run ${workflowStepRunId} not found.`);
    this.name = "WorkflowStepNotFoundError";
  }
}

export class WorkflowStepNotRunningError extends Error {
  constructor(workflowStepRunId: string, state: string) {
    super(`Workflow step run ${workflowStepRunId} is "${state}", not "RUNNING"; cannot request approval.`);
    this.name = "WorkflowStepNotRunningError";
  }
}

export interface RequestApprovalForStepInput {
  workspaceId: string;
  workflowStepRunId: string;
  resourceType: ApprovalResourceType;
  resourceId: string;
  requestedBy: string;
  cost?: number;
  currency?: string;
  note?: string;
  expiresAt?: Date;
  now?: Date;
}

export interface ApprovalRecord {
  id: string;
  workspaceId: string;
  resourceType: string;
  resourceId: string;
  status: string;
  requestedBy: string | null;
  decidedBy: string | null;
  decisionReason: string | null;
  decidedAt: Date | null;
  expiresAt: Date | null;
}

export interface RequestApprovalForStepResult {
  approval: ApprovalRecord;
  created: boolean;
}

export interface DecideApprovalInput {
  workspaceId: string;
  approvalId: string;
  decision: ApprovalDecision;
  decidedBy: string;
  decisionReason?: string;
  now?: Date;
}

export interface DecideApprovalResult {
  approval: ApprovalRecord;
  resumedStep: { id: string; state: "READY" | "FAILED" } | null;
  resumedRun: { id: string; status: "RUNNING" | "FAILED" } | null;
}

/**
 * The mandatory path for gating a workflow step behind a human decision and
 * for deciding that gate. Approvals remain the single shared `Approval`
 * model (see docs/phase-10/10.1-existing-state-inventory.md); this service
 * only adds the atomic single-use/four-eyes/expiry enforcement and the
 * step/run pause-resume side effect the 10.1 gap matrix flagged as unproven.
 */
export class PostgresApprovalGateService {
  constructor(private readonly pool: Pool) {}

  async requestApprovalForStep(input: RequestApprovalForStepInput): Promise<RequestApprovalForStepResult> {
    const now = input.now ?? new Date();
    return inTransaction(this.pool, async (client) => {
      const step = await client.query<{ id: string; workflowRunId: string; state: string; approvalId: string | null }>(
        `SELECT "id", "workflowRunId", "state", "approvalId" FROM "WorkflowStepRun"
         WHERE "workspaceId" = $1 AND "id" = $2 FOR UPDATE`,
        [input.workspaceId, input.workflowStepRunId],
      );
      const stepRow = step.rows[0];
      if (!stepRow) throw new WorkflowStepNotFoundError(input.workflowStepRunId);

      if (stepRow.state === "WAITING_FOR_APPROVAL" && stepRow.approvalId) {
        const existing = await client.query<ApprovalRecord>(
          `SELECT "id", "workspaceId", "resourceType"::TEXT, "resourceId", "status"::TEXT, "requestedBy",
                  "decidedBy", "decisionReason", "decidedAt", "expiresAt"
           FROM "Approval" WHERE "id" = $1 AND "workspaceId" = $2`,
          [stepRow.approvalId, input.workspaceId],
        );
        if (existing.rows[0]) return { approval: existing.rows[0], created: false };
      }

      if (stepRow.state !== "RUNNING") {
        throw new WorkflowStepNotRunningError(input.workflowStepRunId, stepRow.state);
      }

      const approvalId = randomUUID();
      await client.query(
        `INSERT INTO "Approval"
           ("id", "workspaceId", "resourceType", "resourceId", "status", "requestedBy", "cost", "currency", "expiresAt", "payload", "updatedAt")
         VALUES ($1, $2, $3::"ApprovalResourceType", $4, 'PENDING', $5, $6, $7, $8, $9::jsonb, $10)`,
        [
          approvalId,
          input.workspaceId,
          input.resourceType,
          input.resourceId,
          input.requestedBy,
          input.cost ?? null,
          input.currency ?? null,
          input.expiresAt ?? null,
          input.note ? JSON.stringify({ note: input.note }) : null,
          now,
        ],
      );

      await client.query(
        `UPDATE "WorkflowStepRun"
         SET "state" = 'WAITING_FOR_APPROVAL', "approvalId" = $3, "version" = "version" + 1
         WHERE "id" = $1 AND "workspaceId" = $2`,
        [stepRow.id, input.workspaceId, approvalId],
      );

      await client.query(
        `UPDATE "WorkflowRun"
         SET "status" = 'WAITING_FOR_APPROVAL'
         WHERE "id" = $1 AND "workspaceId" = $2 AND "status" = 'RUNNING'`,
        [stepRow.workflowRunId, input.workspaceId],
      );

      return {
        created: true,
        approval: {
          id: approvalId,
          workspaceId: input.workspaceId,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          status: "PENDING",
          requestedBy: input.requestedBy,
          decidedBy: null,
          decisionReason: null,
          decidedAt: null,
          expiresAt: input.expiresAt ?? null,
        },
      };
    });
  }

  async decideApproval(input: DecideApprovalInput): Promise<DecideApprovalResult> {
    const now = input.now ?? new Date();
    return inTransaction(this.pool, async (client) => {
      const found = await client.query<{
        id: string;
        status: string;
        requestedBy: string | null;
        expiresAt: Date | null;
        resourceType: string;
        resourceId: string;
      }>(
        `SELECT "id", "status"::TEXT, "requestedBy", "expiresAt", "resourceType"::TEXT, "resourceId"
         FROM "Approval" WHERE "id" = $1 AND "workspaceId" = $2 FOR UPDATE`,
        [input.approvalId, input.workspaceId],
      );
      const approval = found.rows[0];
      if (!approval) throw new ApprovalNotFoundError(input.approvalId);

      // Single-use: an already-decided approval can never be replayed.
      if (approval.status !== "PENDING") {
        throw new ApprovalDecisionReplayError(input.approvalId, approval.status);
      }
      if (approval.expiresAt && approval.expiresAt.getTime() <= now.getTime()) {
        throw new ApprovalExpiredError(input.approvalId);
      }
      // Four-eyes: the decider may never be the requester.
      if (approval.requestedBy && approval.requestedBy === input.decidedBy) {
        throw new ApprovalFourEyesViolationError(input.approvalId);
      }

      await client.query(
        `UPDATE "Approval"
         SET "status" = $3::"ApprovalStatus", "decidedBy" = $4, "decisionReason" = $5, "decidedAt" = $6, "updatedAt" = $6
         WHERE "id" = $1 AND "workspaceId" = $2`,
        [input.approvalId, input.workspaceId, input.decision, input.decidedBy, input.decisionReason ?? null, now],
      );

      const step = await client.query<{ id: string; workflowRunId: string }>(
        `SELECT "id", "workflowRunId" FROM "WorkflowStepRun"
         WHERE "workspaceId" = $1 AND "approvalId" = $2 AND "state" = 'WAITING_FOR_APPROVAL' FOR UPDATE`,
        [input.workspaceId, input.approvalId],
      );
      const stepRow = step.rows[0];

      let resumedStep: DecideApprovalResult["resumedStep"] = null;
      let resumedRun: DecideApprovalResult["resumedRun"] = null;

      if (stepRow) {
        const nextState = input.decision === "APPROVED" ? "READY" : "FAILED";
        await client.query(
          `UPDATE "WorkflowStepRun"
           SET "state" = $3, "version" = "version" + 1, "error" = $4
           WHERE "id" = $1 AND "workspaceId" = $2`,
          [
            stepRow.id,
            input.workspaceId,
            nextState,
            input.decision === "REJECTED" ? `Approval ${input.approvalId} rejected` : null,
          ],
        );
        resumedStep = { id: stepRow.id, state: nextState };

        if (input.decision === "REJECTED") {
          await client.query(
            `UPDATE "WorkflowRun"
             SET "status" = 'FAILED', "finishedAt" = $3
             WHERE "id" = $1 AND "workspaceId" = $2 AND "status" = 'WAITING_FOR_APPROVAL'`,
            [stepRow.workflowRunId, input.workspaceId, now],
          );
          resumedRun = { id: stepRow.workflowRunId, status: "FAILED" };
        } else {
          const stillWaiting = await client.query<{ count: string }>(
            `SELECT COUNT(*)::TEXT AS count FROM "WorkflowStepRun"
             WHERE "workspaceId" = $1 AND "workflowRunId" = $2 AND "state" = 'WAITING_FOR_APPROVAL' AND "id" != $3`,
            [input.workspaceId, stepRow.workflowRunId, stepRow.id],
          );
          if (Number(stillWaiting.rows[0]?.count ?? 0) === 0) {
            await client.query(
              `UPDATE "WorkflowRun"
               SET "status" = 'RUNNING'
               WHERE "id" = $1 AND "workspaceId" = $2 AND "status" = 'WAITING_FOR_APPROVAL'`,
              [stepRow.workflowRunId, input.workspaceId],
            );
            resumedRun = { id: stepRow.workflowRunId, status: "RUNNING" };
          }
        }
      }

      return {
        approval: {
          id: approval.id,
          workspaceId: input.workspaceId,
          resourceType: approval.resourceType,
          resourceId: approval.resourceId,
          status: input.decision,
          requestedBy: approval.requestedBy,
          decidedBy: input.decidedBy,
          decisionReason: input.decisionReason ?? null,
          decidedAt: now,
          expiresAt: approval.expiresAt,
        },
        resumedStep,
        resumedRun,
      };
    });
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
