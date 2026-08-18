import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import {
  createProviderPolicy,
  recordProviderUsage,
  selectProvider,
} from "@/server/services/provider-gateway";

vi.mock("@/lib/db/client", () => ({
  prisma: {
    providerRoutingPolicy: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    integration: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    providerUsageRecord: {
      aggregate: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    providerHealthCheck: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const db = prisma as unknown as {
  providerRoutingPolicy: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  integration: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  providerUsageRecord: {
    aggregate: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  providerHealthCheck: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

describe("Phase 21 provider gateway", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an allow/deny policy conflict before writing", async () => {
    await expect(
      createProviderPolicy("ws-a", {
        name: "default",
        capability: "LLM_TEXT",
        strategy: "FREE_FIRST",
        enabled: true,
        allowedProviderKeys: ["shared"],
        deniedProviderKeys: ["shared"],
        fallbackProviderKeys: [],
        premiumRequiresApproval: true,
        regionAllowList: [],
      }),
    ).rejects.toThrow("PROVIDER_POLICY_CONFLICT");
    expect(db.providerRoutingPolicy.create).not.toHaveBeenCalled();
  });

  it("selects a connected free provider within the current workspace", async () => {
    db.providerRoutingPolicy.findFirst.mockResolvedValue({
      id: "policy-1",
      workspaceId: "ws-a",
      strategy: "FREE_FIRST",
      allowedProviderKeys: [],
      deniedProviderKeys: [],
      fallbackProviderKeys: [],
      regionAllowList: [],
      maxCostPerCall: null,
      dailyBudget: null,
      premiumRequiresApproval: true,
    });
    db.integration.findMany.mockResolvedValue([
      { providerKey: "free-provider" },
      { providerKey: "premium-provider" },
    ]);
    db.providerUsageRecord.aggregate.mockResolvedValue({
      _sum: { estimatedCost: null },
    });
    db.providerHealthCheck.findFirst.mockResolvedValue(null);

    const decision = await selectProvider("ws-a", "LLM_TEXT", [
      {
        providerKey: "premium-provider",
        capability: "LLM_TEXT",
        estimatedCost: 0.03,
        qualityScore: 0.99,
        premium: true,
      },
      {
        providerKey: "free-provider",
        capability: "LLM_TEXT",
        estimatedCost: 0,
        qualityScore: 0.7,
        premium: false,
      },
    ]);

    expect(decision.providerKey).toBe("free-provider");
    expect(decision.requiresApproval).toBe(false);
    expect(db.providerRoutingPolicy.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ workspaceId: "ws-a" }) }),
    );
  });

  it("opens the circuit after three recent failures", async () => {
    db.integration.findFirst.mockResolvedValue({ id: "integration-1" });
    db.providerUsageRecord.create.mockResolvedValue({
      id: "usage-1",
      providerKey: "broken",
    });
    db.providerUsageRecord.findMany.mockResolvedValue([
      { success: false },
      { success: false },
      { success: false },
    ]);
    db.providerHealthCheck.create.mockResolvedValue({ id: "health-1" });

    await recordProviderUsage("ws-a", {
      providerKey: "broken",
      capability: "VIDEO",
      inputUnits: 0,
      outputUnits: 0,
      estimatedCost: 0,
      currency: "EUR",
      success: false,
      errorCode: "TIMEOUT",
    });

    expect(db.providerHealthCheck.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "ws-a",
        providerKey: "broken",
        status: "UNAVAILABLE",
      }),
    });
  });
});
