import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import {
  canTransitionAgentStatus,
  isLifecycleStatus,
  setAgentStatus,
  getAgentCapabilities,
  startAgentRun,
  finishAgentRun,
  createAgentMemoryEntry,
  getAgentMemoryEntries,
  updateAgentMemoryEntry,
  deleteAgentMemoryEntry,
} from "../agents";
import { incrementMetric } from "@/lib/observability/metrics";

vi.mock("@/lib/db/client", () => ({
  prisma: {
    agent: {
      findFirst: vi.fn(),
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
  },
}));

vi.mock("@/lib/observability/metrics", () => ({
  incrementMetric: vi.fn(),
}));

const prismaMock = prisma as unknown as {
  agent: { findFirst: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  agentRun: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  agentToolDefinition: { findMany: ReturnType<typeof vi.fn> };
  agentMemoryEntry: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
};

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

  it("sets agent status when transition is legal", async () => {
    prismaMock.agent.findFirst.mockResolvedValueOnce({ id: "a1", status: "IDLE" });
    prismaMock.agent.update.mockResolvedValueOnce({ id: "a1", status: "RUNNING" });

    const result = await setAgentStatus("a1", "running", { workspaceId: "ws1" });

    expect(result).toBe("RUNNING");
    expect(prismaMock.agent.update).toHaveBeenCalledWith({
      where: { id: "a1", workspaceId: "ws1" },
      data: { status: "RUNNING" },
      select: { id: true, status: true },
    });
  });

  it("enforces workspace isolation in the read filter", async () => {
    prismaMock.agent.findFirst.mockResolvedValueOnce({ id: "a1", status: "IDLE" });
    prismaMock.agent.update.mockResolvedValueOnce({ id: "a1", status: "PAUSED" });

    await setAgentStatus("a1", "paused", { workspaceId: "ws-99" });

    expect(prismaMock.agent.findFirst).toHaveBeenCalledWith({
      where: { id: "a1", workspaceId: "ws-99" },
      select: { id: true, status: true },
    });
  });

  it("is idempotent for same status", async () => {
    prismaMock.agent.findFirst.mockResolvedValueOnce({ id: "a1", status: "RUNNING" });

    const result = await setAgentStatus("a1", "running", { workspaceId: "ws1" });

    expect(result).toBe("RUNNING");
    expect(prismaMock.agent.update).not.toHaveBeenCalled();
  });

  it("throws on illegal transition", async () => {
    prismaMock.agent.findFirst.mockResolvedValueOnce({ id: "a1", status: "ERROR" });

    await expect(setAgentStatus("a1", "running", { workspaceId: "ws1" })).rejects.toThrow(
      "ILLEGAL_AGENT_TRANSITION",
    );
  });

  it("throws when agent not found", async () => {
    prismaMock.agent.findFirst.mockResolvedValueOnce(null);

    await expect(setAgentStatus("missing", "running", { workspaceId: "ws1" })).rejects.toThrow("AGENT_NOT_FOUND");
  });
});

describe("agents service — capabilities", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns tools as capabilities with resolved permissions", async () => {
    prismaMock.agentToolDefinition.findMany.mockResolvedValueOnce([
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
    prismaMock.agentRun.findFirst.mockResolvedValueOnce(null);
    prismaMock.agent.findFirst.mockResolvedValueOnce({ id: "a1" });
    prismaMock.agentRun.create.mockResolvedValueOnce({
      id: "r1",
      status: "RUNNING",
      startedAt: new Date("2026-01-01T00:00:00Z"),
    });
    prismaMock.agent.update.mockResolvedValueOnce({});

    const run = await startAgentRun({ agentId: "a1", executionKey: "ek-1" }, { workspaceId: "ws1" });

    expect(run.status).toBe("RUNNING");
    expect(incrementMetric).toHaveBeenCalledWith("ugc_agent_runs_total");
    expect(prismaMock.agentRun.create).toHaveBeenCalledWith(
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
    prismaMock.agentRun.findFirst.mockResolvedValueOnce({
      id: "r1",
      status: "RUNNING",
      startedAt: new Date("2026-01-01T00:00:00Z"),
    });

    const run = await startAgentRun({ agentId: "a1", executionKey: "ek-1" }, { workspaceId: "ws1" });

    expect(run.id).toBe("r1");
    expect(run.status).toBe("RUNNING");
    expect(prismaMock.agentRun.findFirst).toHaveBeenCalledWith({
      where: {
        agentId: "a1",
        workspaceId: "ws1",
        status: "RUNNING",
        logs: { path: ["executionKey"], equals: "ek-1" },
      },
      select: { id: true, status: true, startedAt: true },
    });
    expect(prismaMock.agent.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.agentRun.create).not.toHaveBeenCalled();
    expect(incrementMetric).not.toHaveBeenCalled();
  });

  it("finishes a running run and marks agent success", async () => {
    prismaMock.agentRun.findFirst.mockResolvedValueOnce({
      id: "r1",
      status: "RUNNING",
      agentId: "a1",
    });
    prismaMock.agentRun.update.mockResolvedValueOnce({
      id: "r1",
      status: "SUCCESS",
      finishedAt: new Date("2026-01-01T00:01:00Z"),
    });
    prismaMock.agent.update.mockResolvedValueOnce({});

    const result = await finishAgentRun("r1", { status: "SUCCESS" }, { workspaceId: "ws1" });

    expect(result.status).toBe("SUCCESS");
    expect(incrementMetric).toHaveBeenCalledWith("ugc_agent_runs_succeeded_total");
    expect(prismaMock.agent.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { status: "IDLE", successCount: { increment: 1 } },
    });
  });

  it("is idempotent when re-finishing a terminal run", async () => {
    prismaMock.agentRun.findFirst.mockResolvedValueOnce({
      id: "r1",
      status: "SUCCESS",
      agentId: "a1",
    });

    const result = await finishAgentRun("r1", { status: "SUCCESS" }, { workspaceId: "ws1" });

    expect(result.finishedAt).toBeNull();
    expect(prismaMock.agentRun.update).not.toHaveBeenCalled();
    expect(incrementMetric).not.toHaveBeenCalled();
  });

  it("throws when finishing a missing run", async () => {
    prismaMock.agentRun.findFirst.mockResolvedValueOnce(null);

    await expect(finishAgentRun("missing", { status: "SUCCESS" }, { workspaceId: "ws1" })).rejects.toThrow(
      "AGENT_RUN_NOT_FOUND",
    );
  });
});

describe("agents service — memory CRUD", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a memory entry with tenant isolation", async () => {
    prismaMock.agentMemoryEntry.create.mockResolvedValueOnce({ id: "m1" });

    await createAgentMemoryEntry({
      workspaceId: "ws1",
      agentKey: "researcher",
      key: "pref_lang",
      value: { lang: "de" },
    });

    expect(prismaMock.agentMemoryEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "ws1",
        agentKey: "researcher",
        key: "pref_lang",
        type: "FACT",
        importance: 1,
      }),
    });
  });

  it("reads entries filtered by tenant and agent key", async () => {
    prismaMock.agentMemoryEntry.findMany.mockResolvedValueOnce([{ id: "m1" }]);

    await getAgentMemoryEntries("ws1", "researcher", { type: "PREFERENCE" });

    expect(prismaMock.agentMemoryEntry.findMany).toHaveBeenCalledWith({
      where: { workspaceId: "ws1", agentKey: "researcher", type: "PREFERENCE" },
      orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
    });
  });

  it("updates an entry tenant-isolated", async () => {
    prismaMock.agentMemoryEntry.findFirst.mockResolvedValueOnce({ id: "m1" });
    prismaMock.agentMemoryEntry.update.mockResolvedValueOnce({ id: "m1" });

    await updateAgentMemoryEntry("m1", "ws1", { importance: 5 });

    expect(prismaMock.agentMemoryEntry.update).toHaveBeenCalledWith({
      where: { id: "m1", workspaceId: "ws1" },
      data: { importance: 5 },
    });
  });

  it("deletes only within the tenant", async () => {
    prismaMock.agentMemoryEntry.deleteMany.mockResolvedValueOnce({ count: 1 });

    await deleteAgentMemoryEntry("m1", "ws1");

    expect(prismaMock.agentMemoryEntry.deleteMany).toHaveBeenCalledWith({
      where: { id: "m1", workspaceId: "ws1" },
    });
  });
});
