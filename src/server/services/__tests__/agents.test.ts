import { beforeEach, describe, expect, it, vi } from "vitest";

const { txMock, withWorkspaceDbMock } = vi.hoisted(() => {
  const tx = {
    agent: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    agentRun: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    agentToolDefinition: {
      findMany: vi.fn(),
    },
    agentMemoryEntry: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  };

  return {
    txMock: tx,
    withWorkspaceDbMock: vi.fn(
      async (
        callback: (transaction: typeof tx, workspaceId: string) => Promise<unknown>,
        workspaceIdOverride?: string,
      ) => callback(tx, workspaceIdOverride ?? "ws-default"),
    ),
  };
});

vi.mock("@/lib/db/workspace-context", () => ({
  withWorkspaceDb: withWorkspaceDbMock,
}));

vi.mock("@/lib/observability/metrics", () => ({
  incrementMetric: vi.fn(),
}));

import { incrementMetric } from "@/lib/observability/metrics";
import {
  canTransitionAgentStatus,
  createAgentMemoryEntry,
  deleteAgentMemoryEntry,
  finishAgentRun,
  getAgentCapabilities,
  getAgentMemoryEntries,
  isLifecycleStatus,
  setAgentStatus,
  startAgentRun,
  updateAgentMemoryEntry,
} from "../agents";

describe("agents service — lifecycle transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recognizes valid lifecycle statuses", () => {
    expect(isLifecycleStatus("registered")).toBe(true);
    expect(isLifecycleStatus("enabled")).toBe(true);
    expect(isLifecycleStatus("running")).toBe(true);
    expect(isLifecycleStatus("paused")).toBe(true);
    expect(isLifecycleStatus("disabled")).toBe(true);
    expect(isLifecycleStatus("bogus")).toBe(false);
  });

  it("allows legal transitions and rejects illegal ones", () => {
    expect(canTransitionAgentStatus("IDLE", "RUNNING")).toBe(true);
    expect(canTransitionAgentStatus("RUNNING", "PAUSED")).toBe(true);
    expect(canTransitionAgentStatus("ERROR", "RUNNING")).toBe(false);
    expect(canTransitionAgentStatus("PAUSED", "ERROR")).toBe(true);
    expect(canTransitionAgentStatus("IDLE", "ERROR")).toBe(true);
  });

  it("sets agent status inside the requested workspace transaction", async () => {
    txMock.agent.findUnique.mockResolvedValueOnce({ id: "a1", status: "IDLE" });
    txMock.agent.update.mockResolvedValueOnce({ status: "RUNNING" });

    const result = await setAgentStatus("a1", "running", { workspaceId: "ws1" });

    expect(result).toBe("RUNNING");
    expect(withWorkspaceDbMock).toHaveBeenCalledWith(expect.any(Function), "ws1");
    expect(txMock.agent.findUnique).toHaveBeenCalledWith({
      where: { id: "a1" },
      select: { id: true, status: true },
    });
    expect(txMock.agent.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { status: "RUNNING" },
      select: { status: true },
    });
  });

  it("is idempotent for the same status", async () => {
    txMock.agent.findUnique.mockResolvedValueOnce({ id: "a1", status: "RUNNING" });

    const result = await setAgentStatus("a1", "running", { workspaceId: "ws1" });

    expect(result).toBe("RUNNING");
    expect(txMock.agent.update).not.toHaveBeenCalled();
  });

  it("throws on illegal transition", async () => {
    txMock.agent.findUnique.mockResolvedValueOnce({ id: "a1", status: "ERROR" });

    await expect(
      setAgentStatus("a1", "running", { workspaceId: "ws1" }),
    ).rejects.toThrow("ILLEGAL_AGENT_TRANSITION");
  });

  it("throws when agent is not found", async () => {
    txMock.agent.findUnique.mockResolvedValueOnce(null);

    await expect(
      setAgentStatus("missing", "running", { workspaceId: "ws1" }),
    ).rejects.toThrow("AGENT_NOT_FOUND");
  });
});

describe("agents service — capabilities", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns tools as capabilities with resolved permissions", async () => {
    txMock.agentToolDefinition.findMany.mockResolvedValueOnce([
      {
        id: "t1",
        name: "web_search",
        policies: [
          {
            requiresApproval: true,
            maxCostPerCall: { toNumber: () => 0.5 },
            rateLimitPerMin: 10,
            allowedAgentKeys: ["researcher"],
          },
        ],
      },
    ]);

    const caps = await getAgentCapabilities("ws1");

    expect(withWorkspaceDbMock).toHaveBeenCalledWith(expect.any(Function), "ws1");
    expect(caps).toHaveLength(1);
    expect(caps[0]).toMatchObject({
      name: "web_search",
      version: "t1",
      permissions: [
        {
          requiresApproval: true,
          maxCostPerCall: 0.5,
          rateLimitPerMin: 10,
          allowedAgentKeys: ["researcher"],
        },
      ],
    });
  });
});

describe("agents service — execution records", () => {
  beforeEach(() => vi.clearAllMocks());

  it("starts a run and increments observability", async () => {
    txMock.agent.findUnique.mockResolvedValueOnce({ id: "a1" });
    txMock.agentRun.findFirst.mockResolvedValueOnce(null);
    txMock.agentRun.create.mockResolvedValueOnce({
      id: "r1",
      status: "RUNNING",
      startedAt: new Date("2026-01-01T00:00:00Z"),
    });
    txMock.agent.update.mockResolvedValueOnce({});

    const run = await startAgentRun(
      { agentId: "a1", executionKey: "ek-1" },
      { workspaceId: "ws1" },
    );

    expect(run.status).toBe("RUNNING");
    expect(incrementMetric).toHaveBeenCalledWith("ugc_agent_runs_total");
    expect(txMock.agentRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          agentId: "a1",
          logs: { executionKey: "ek-1" },
          status: "RUNNING",
        }),
      }),
    );
  });

  it("deduplicates a run by execution key", async () => {
    txMock.agent.findUnique.mockResolvedValueOnce({ id: "a1" });
    txMock.agentRun.findFirst.mockResolvedValueOnce({
      id: "r1",
      status: "RUNNING",
      startedAt: new Date("2026-01-01T00:00:00Z"),
    });

    const run = await startAgentRun(
      { agentId: "a1", executionKey: "ek-1" },
      { workspaceId: "ws1" },
    );

    expect(run.id).toBe("r1");
    expect(txMock.agentRun.create).not.toHaveBeenCalled();
    expect(txMock.agent.update).not.toHaveBeenCalled();
    expect(incrementMetric).toHaveBeenCalledWith("ugc_agent_runs_total");
  });

  it("finishes a running run and marks agent success", async () => {
    txMock.agentRun.findUnique.mockResolvedValueOnce({
      id: "r1",
      status: "RUNNING",
      agentId: "a1",
    });
    txMock.agentRun.update.mockResolvedValueOnce({
      id: "r1",
      status: "SUCCESS",
      finishedAt: new Date("2026-01-01T00:01:00Z"),
    });
    txMock.agent.update.mockResolvedValueOnce({});

    const result = await finishAgentRun(
      "r1",
      { status: "SUCCESS" },
      { workspaceId: "ws1" },
    );

    expect(result.status).toBe("SUCCESS");
    expect(incrementMetric).toHaveBeenCalledWith("ugc_agent_runs_succeeded_total");
    expect(txMock.agent.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { status: "IDLE", successCount: { increment: 1 } },
    });
  });

  it("is idempotent when re-finishing a terminal run", async () => {
    txMock.agentRun.findUnique.mockResolvedValueOnce({
      id: "r1",
      status: "SUCCESS",
      agentId: "a1",
    });

    const result = await finishAgentRun(
      "r1",
      { status: "SUCCESS" },
      { workspaceId: "ws1" },
    );

    expect(result.finishedAt).toBeNull();
    expect(txMock.agentRun.update).not.toHaveBeenCalled();
    expect(incrementMetric).not.toHaveBeenCalled();
  });

  it("throws when finishing a missing run", async () => {
    txMock.agentRun.findUnique.mockResolvedValueOnce(null);

    await expect(
      finishAgentRun(
        "missing",
        { status: "SUCCESS" },
        { workspaceId: "ws1" },
      ),
    ).rejects.toThrow("AGENT_RUN_NOT_FOUND");
  });
});

describe("agents service — memory CRUD", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a memory entry inside its workspace transaction", async () => {
    txMock.agentMemoryEntry.create.mockResolvedValueOnce({ id: "m1" });

    await createAgentMemoryEntry({
      workspaceId: "ws1",
      agentKey: "researcher",
      key: "pref_lang",
      value: { lang: "de" },
    });

    expect(withWorkspaceDbMock).toHaveBeenCalledWith(expect.any(Function), "ws1");
    expect(txMock.agentMemoryEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "ws1",
        agentKey: "researcher",
        key: "pref_lang",
        type: "FACT",
        importance: 1,
      }),
    });
  });

  it("reads entries filtered by workspace and agent key", async () => {
    txMock.agentMemoryEntry.findMany.mockResolvedValueOnce([{ id: "m1" }]);

    await getAgentMemoryEntries("ws1", "researcher", { type: "PREFERENCE" });

    expect(txMock.agentMemoryEntry.findMany).toHaveBeenCalledWith({
      where: { workspaceId: "ws1", agentKey: "researcher", type: "PREFERENCE" },
      orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
    });
  });

  it("updates only a visible entry in the workspace", async () => {
    txMock.agentMemoryEntry.findFirst.mockResolvedValueOnce({ id: "m1" });
    txMock.agentMemoryEntry.update.mockResolvedValueOnce({ id: "m1" });

    await updateAgentMemoryEntry("m1", "ws1", { importance: 5 });

    expect(txMock.agentMemoryEntry.findFirst).toHaveBeenCalledWith({
      where: { id: "m1", workspaceId: "ws1" },
      select: { id: true },
    });
    expect(txMock.agentMemoryEntry.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { importance: 5 },
    });
  });

  it("fails closed when the memory entry is outside the workspace", async () => {
    txMock.agentMemoryEntry.findFirst.mockResolvedValueOnce(null);

    await expect(
      updateAgentMemoryEntry("m1", "ws1", { importance: 5 }),
    ).rejects.toThrow("AGENT_MEMORY_NOT_FOUND");
    expect(txMock.agentMemoryEntry.update).not.toHaveBeenCalled();
  });

  it("deletes only within the workspace", async () => {
    txMock.agentMemoryEntry.deleteMany.mockResolvedValueOnce({ count: 1 });

    await deleteAgentMemoryEntry("m1", "ws1");

    expect(txMock.agentMemoryEntry.deleteMany).toHaveBeenCalledWith({
      where: { id: "m1", workspaceId: "ws1" },
    });
  });
});
