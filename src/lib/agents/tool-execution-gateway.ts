import { randomUUID } from "node:crypto";

import type { Pool, PoolClient } from "pg";

import { withWorkspacePgTransaction } from "@/lib/db/workspace-pg-transaction";

export type ToolExecutionDenialReason =
  | "TOOL_NOT_FOUND"
  | "TOOL_DISABLED"
  | "AGENT_NOT_ALLOWED"
  | "COST_LIMIT_EXCEEDED"
  | "RATE_LIMITED"
  | "APPROVAL_REQUIRED";

export class ToolExecutionDeniedError extends Error {
  constructor(
    public readonly reason: ToolExecutionDenialReason,
    public readonly toolName: string,
    detail: string,
  ) {
    super(`Tool execution for "${toolName}" denied: ${detail}`);
    this.name = "ToolExecutionDeniedError";
  }
}

export interface ToolExecutionRequest {
  workspaceId: string;
  toolName: string;
  agentKey: string;
  agentRunId?: string;
  input?: unknown;
  /** Caller-declared cost estimate, checked against the policy's per-call cap before execution. */
  estimatedCost?: number;
  /** Id of an already-decided `Approval` row (resourceType `agent_tool_invocation`) for tools that require approval. */
  approvalId?: string;
  now?: Date;
}

export interface ToolExecutionResult<TOutput = unknown> {
  callId: string;
  toolId: string;
  output: TOutput;
  cost: number | null;
  durationMs: number;
}

/**
 * The only sanctioned path to invoke an `AgentToolDefinition`. Every tool
 * call must go through `execute`; direct execution that bypasses
 * `AgentToolPolicy` enforcement is prohibited by the Phase 10 architecture
 * decision (see docs/phase-10/10.1-existing-state-inventory.md).
 */
export class PostgresToolExecutionGateway {
  constructor(private readonly pool: Pool) {}

  async execute<TOutput = unknown>(
    request: ToolExecutionRequest,
    executor: (input: unknown) => Promise<{ output: TOutput; cost?: number }>,
  ): Promise<ToolExecutionResult<TOutput>> {
    const now = request.now ?? new Date();
    const reservation = await this.reserveOrDeny(request, now);

    const startedAt = process.hrtime.bigint();
    try {
      const { output, cost } = await executor(request.input);
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      await withWorkspacePgTransaction(this.pool, request.workspaceId, async (client) => client.query(
        `UPDATE "AgentToolCall"
         SET "status" = 'SUCCESS', "output" = $3::jsonb, "cost" = $4, "durationMs" = $5
         WHERE "workspaceId" = $1 AND "id" = $2`,
        [request.workspaceId, reservation.callId, JSON.stringify(output ?? null), cost ?? null, Math.round(durationMs)],
      ));
      return { callId: reservation.callId, toolId: reservation.toolId, output, cost: cost ?? null, durationMs };
    } catch (error) {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const message = error instanceof Error ? error.message : String(error);
      await withWorkspacePgTransaction(this.pool, request.workspaceId, async (client) => client.query(
        `UPDATE "AgentToolCall"
         SET "status" = 'FAILED', "error" = $3, "durationMs" = $4
         WHERE "workspaceId" = $1 AND "id" = $2`,
        [request.workspaceId, reservation.callId, message, Math.round(durationMs)],
      ));
      throw error;
    }
  }

  private async reserveOrDeny(
    request: ToolExecutionRequest,
    now: Date,
  ): Promise<{ callId: string; toolId: string }> {
    // Denials must still be committed as an audit row, so the transaction
    // always commits; only success/denial is distinguished afterwards. A
    // denial thrown *inside* the transaction would roll back its own audit
    // insert, which would silently drop the evidence the gateway exists to
    // produce.
    const outcome = await withWorkspacePgTransaction(this.pool, request.workspaceId, async (client) => {
      // Serialize policy evaluation + rate-limit accounting per (workspace, tool)
      // so concurrent callers cannot race past the per-minute limit.
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
        `${request.workspaceId}:${request.toolName}`,
      ]);

      const definition = await client.query<{
        id: string;
        enabled: boolean;
      }>(
        `SELECT "id", "enabled" FROM "AgentToolDefinition" WHERE "workspaceId" = $1 AND "name" = $2`,
        [request.workspaceId, request.toolName],
      );
      const tool = definition.rows[0];
      if (!tool) {
        // No valid toolId to attach an audit row to; nothing was written, so
        // rolling back this no-op transaction is harmless.
        throw new ToolExecutionDeniedError("TOOL_NOT_FOUND", request.toolName, "no such tool in this workspace");
      }
      if (!tool.enabled) {
        return this.deny(client, request, now, tool.id, "TOOL_DISABLED", "tool is disabled");
      }

      const policies = await client.query<{
        requiresApproval: boolean;
        maxCostPerCall: string | null;
        rateLimitPerMin: number | null;
        allowedAgentKeys: string[];
      }>(
        `SELECT "requiresApproval", "maxCostPerCall", "rateLimitPerMin", "allowedAgentKeys"
         FROM "AgentToolPolicy" WHERE "workspaceId" = $1 AND "toolId" = $2`,
        [request.workspaceId, tool.id],
      );

      // Most-restrictive-wins: any matching policy that denies, denies.
      const requiresApproval = policies.rows.some((policy) => policy.requiresApproval);
      const maxCostPerCall = minDefined(policies.rows.map((policy) => policy.maxCostPerCall).map(toNumberOrNull));
      const rateLimitPerMin = minDefined(policies.rows.map((policy) => policy.rateLimitPerMin));
      const allowLists = policies.rows.map((policy) => policy.allowedAgentKeys).filter((list) => list.length > 0);

      if (allowLists.length > 0 && !allowLists.every((list) => list.includes(request.agentKey))) {
        return this.deny(
          client,
          request,
          now,
          tool.id,
          "AGENT_NOT_ALLOWED",
          `agent "${request.agentKey}" is not on the allowed-agent list for this tool`,
        );
      }

      if (
        maxCostPerCall !== null &&
        request.estimatedCost !== undefined &&
        request.estimatedCost > maxCostPerCall
      ) {
        return this.deny(
          client,
          request,
          now,
          tool.id,
          "COST_LIMIT_EXCEEDED",
          `estimated cost ${request.estimatedCost} exceeds per-call limit ${maxCostPerCall}`,
        );
      }

      if (requiresApproval) {
        const approved = request.approvalId
          ? await client.query<{ id: string }>(
              `SELECT "id" FROM "Approval"
               WHERE "workspaceId" = $1 AND "id" = $2
                 AND "resourceType" = 'agent_tool_invocation'
                 AND "resourceId" = $3
                 AND "status" = 'APPROVED'
                 AND ("expiresAt" IS NULL OR "expiresAt" > $4)`,
              [request.workspaceId, request.approvalId, tool.id, now],
            )
          : { rows: [] as { id: string }[] };
        if (approved.rows.length === 0) {
          return this.deny(
            client,
            request,
            now,
            tool.id,
            "APPROVAL_REQUIRED",
            "tool requires an approved agent_tool_invocation approval",
          );
        }
      }

      if (rateLimitPerMin !== null) {
        const windowStart = new Date(now.getTime() - 60_000);
        const recent = await client.query<{ count: string }>(
          `SELECT COUNT(*)::TEXT AS count FROM "AgentToolCall"
           WHERE "workspaceId" = $1 AND "toolId" = $2
             AND "status" IN ('SUCCESS', 'RUNNING')
             AND "createdAt" > $3`,
          [request.workspaceId, tool.id, windowStart],
        );
        if (Number(recent.rows[0]?.count ?? 0) >= rateLimitPerMin) {
          return this.deny(
            client,
            request,
            now,
            tool.id,
            "RATE_LIMITED",
            `rate limit of ${rateLimitPerMin} calls/min exceeded`,
          );
        }
      }

      const callId = randomUUID();
      await client.query(
        `INSERT INTO "AgentToolCall" ("id", "workspaceId", "agentRunId", "toolId", "input", "status", "createdAt")
         VALUES ($1, $2, $3, $4, $5::jsonb, 'RUNNING', $6)`,
        [callId, request.workspaceId, request.agentRunId ?? null, tool.id, JSON.stringify(request.input ?? null), now],
      );
      return { ok: true as const, callId, toolId: tool.id };
    });

    if (!outcome.ok) throw outcome.error;
    return outcome;
  }

  private async deny(
    client: PoolClient,
    request: ToolExecutionRequest,
    now: Date,
    toolId: string,
    reason: ToolExecutionDenialReason,
    detail: string,
  ): Promise<{ ok: false; error: ToolExecutionDeniedError }> {
    await client.query(
      `INSERT INTO "AgentToolCall" ("id", "workspaceId", "agentRunId", "toolId", "input", "status", "error", "createdAt")
       VALUES ($1, $2, $3, $4, $5::jsonb, 'DENIED', $6, $7)`,
      [randomUUID(), request.workspaceId, request.agentRunId ?? null, toolId, JSON.stringify(request.input ?? null), `${reason}: ${detail}`, now],
    );
    return { ok: false, error: new ToolExecutionDeniedError(reason, request.toolName, detail) };
  }
}

function toNumberOrNull(value: string | null): number | null {
  return value === null ? null : Number(value);
}

function minDefined(values: Array<number | null>): number | null {
  const defined = values.filter((value): value is number => value !== null);
  return defined.length === 0 ? null : Math.min(...defined);
}


