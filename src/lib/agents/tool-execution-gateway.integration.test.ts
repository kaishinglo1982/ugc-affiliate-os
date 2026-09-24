import { randomUUID } from "node:crypto";

import { Pool } from "pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { PostgresToolExecutionGateway, ToolExecutionDeniedError } from "@/lib/agents/tool-execution-gateway";

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb("PostgresToolExecutionGateway", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const gateway = new PostgresToolExecutionGateway(pool);

  async function createTool(input: {
    workspaceId: string;
    enabled?: boolean;
    requiresApproval?: boolean;
    maxCostPerCall?: number;
    rateLimitPerMin?: number;
    allowedAgentKeys?: string[];
  }): Promise<{ toolId: string; toolName: string }> {
    const toolId = randomUUID();
    const toolName = `phase-10-5-tool-${randomUUID()}`;
    await pool.query(
      `INSERT INTO "AgentToolDefinition" ("id", "workspaceId", "name", "enabled", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW())`,
      [toolId, input.workspaceId, toolName, input.enabled ?? true],
    );
    await pool.query(
      `INSERT INTO "AgentToolPolicy"
         ("id", "workspaceId", "toolId", "requiresApproval", "maxCostPerCall", "rateLimitPerMin", "allowedAgentKeys", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        randomUUID(),
        input.workspaceId,
        toolId,
        input.requiresApproval ?? false,
        input.maxCostPerCall ?? null,
        input.rateLimitPerMin ?? null,
        input.allowedAgentKeys ?? [],
      ],
    );
    return { toolId, toolName };
  }

  let workspaceId = randomUUID();

  beforeEach(() => {
    workspaceId = randomUUID();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("executes the tool and records a SUCCESS call", async () => {
    const { toolName } = await createTool({ workspaceId });

    const result = await gateway.execute(
      { workspaceId, toolName, agentKey: "agent-a", input: { q: 1 } },
      async () => ({ output: { ok: true }, cost: 0.5 }),
    );

    expect(result.output).toEqual({ ok: true });
    expect(result.cost).toBe(0.5);

    const row = await pool.query(`SELECT "status", "cost" FROM "AgentToolCall" WHERE "id" = $1`, [result.callId]);
    expect(row.rows[0].status).toBe("SUCCESS");
  });

  it("denies unknown tools", async () => {
    await expect(
      gateway.execute({ workspaceId, toolName: "does-not-exist", agentKey: "agent-a" }, async () => ({ output: null })),
    ).rejects.toThrow(ToolExecutionDeniedError);
  });

  it("rejects an agent run from another workspace before execution", async () => {
    const { toolName } = await createTool({ workspaceId });
    const foreignWorkspaceId = randomUUID();
    const agentId = randomUUID();
    const agentRunId = randomUUID();

    await pool.query(
      `INSERT INTO "Agent" ("id", "workspaceId", "key", "name", "role", "status", "updatedAt")
       VALUES ($1, $2, $3, $4, 'IDLE', NOW())`,
      [agentId, foreignWorkspaceId, `foreign-agent-${randomUUID()}`, "Foreign agent", "test"],
    );
    await pool.query(
      `INSERT INTO "AgentRun" ("id", "workspaceId", "agentId", "status", "startedAt")
       VALUES ($1, $2, $3, 'RUNNING', NOW())`,
      [agentRunId, foreignWorkspaceId, agentId],
    );

    await expect(
      gateway.execute(
        { workspaceId, toolName, agentKey: "agent-a", agentRunId },
        async () => ({ output: { shouldNotRun: true } }),
      ),
    ).rejects.toThrow("AGENT_RUN_NOT_FOUND_IN_WORKSPACE");

    const calls = await pool.query(
      `SELECT COUNT(*)::int AS count FROM "AgentToolCall"
       WHERE "workspaceId" = $1 AND "agentRunId" = $2`,
      [workspaceId, agentRunId],
    );
    expect(calls.rows[0].count).toBe(0);

    await pool.query(`DELETE FROM "AgentRun" WHERE "id" = $1 AND "workspaceId" = $2`, [agentRunId, foreignWorkspaceId]);
    await pool.query(`DELETE FROM "Agent" WHERE "id" = $1 AND "workspaceId" = $2`, [agentId, foreignWorkspaceId]);
  });

  it("denies disabled tools and records the denial", async () => {
    const { toolName, toolId } = await createTool({ workspaceId, enabled: false });

    await expect(
      gateway.execute({ workspaceId, toolName, agentKey: "agent-a" }, async () => ({ output: null })),
    ).rejects.toHaveProperty("reason", "TOOL_DISABLED");

    const denied = await pool.query(
      `SELECT "status" FROM "AgentToolCall" WHERE "workspaceId" = $1 AND "toolId" = $2`,
      [workspaceId, toolId],
    );
    expect(denied.rows[0].status).toBe("DENIED");
  });

  it("denies agents that are not on the allow-list", async () => {
    const { toolName } = await createTool({ workspaceId, allowedAgentKeys: ["agent-allowed"] });

    await expect(
      gateway.execute({ workspaceId, toolName, agentKey: "agent-other" }, async () => ({ output: null })),
    ).rejects.toHaveProperty("reason", "AGENT_NOT_ALLOWED");

    const result = await gateway.execute(
      { workspaceId, toolName, agentKey: "agent-allowed" },
      async () => ({ output: { ok: true } }),
    );
    expect(result.output).toEqual({ ok: true });
  });

  it("denies calls whose estimated cost exceeds the per-call limit", async () => {
    const { toolName } = await createTool({ workspaceId, maxCostPerCall: 1 });

    await expect(
      gateway.execute(
        { workspaceId, toolName, agentKey: "agent-a", estimatedCost: 5 },
        async () => ({ output: null }),
      ),
    ).rejects.toHaveProperty("reason", "COST_LIMIT_EXCEEDED");
  });

  it("denies tools requiring approval without an approved approval id", async () => {
    const { toolName } = await createTool({ workspaceId, requiresApproval: true });

    await expect(
      gateway.execute({ workspaceId, toolName, agentKey: "agent-a" }, async () => ({ output: null })),
    ).rejects.toHaveProperty("reason", "APPROVAL_REQUIRED");
  });

  it("allows tools requiring approval once an approved approval exists", async () => {
    const { toolName, toolId } = await createTool({ workspaceId, requiresApproval: true });
    const approvalId = randomUUID();
    await pool.query(
      `INSERT INTO "Approval" ("id", "workspaceId", "resourceType", "resourceId", "status", "updatedAt")
       VALUES ($1, $2, 'agent_tool_invocation', $3, 'APPROVED', NOW())`,
      [approvalId, workspaceId, toolId],
    );

    const result = await gateway.execute(
      { workspaceId, toolName, agentKey: "agent-a", approvalId },
      async () => ({ output: { ok: true } }),
    );
    expect(result.output).toEqual({ ok: true });
  });

  it("enforces the per-minute rate limit atomically under concurrency", async () => {
    const { toolName } = await createTool({ workspaceId, rateLimitPerMin: 1 });

    const results = await Promise.allSettled([
      gateway.execute({ workspaceId, toolName, agentKey: "agent-a" }, async () => ({ output: "one" })),
      gateway.execute({ workspaceId, toolName, agentKey: "agent-a" }, async () => ({ output: "two" })),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected && (rejected as PromiseRejectedResult).reason).toBeInstanceOf(ToolExecutionDeniedError);
  });

  it("records a FAILED call and rethrows when the executor throws", async () => {
    const { toolName, toolId } = await createTool({ workspaceId });

    await expect(
      gateway.execute({ workspaceId, toolName, agentKey: "agent-a" }, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    const row = await pool.query(
      `SELECT "status", "error" FROM "AgentToolCall" WHERE "workspaceId" = $1 AND "toolId" = $2`,
      [workspaceId, toolId],
    );
    expect(row.rows[0].status).toBe("FAILED");
    expect(row.rows[0].error).toBe("boom");
  });
});
