import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import {
  createCreatorEngagement,
  evaluateGoLiveReadiness,
  reviewCreatorDeliverable,
} from "@/server/services/phase23-30";

vi.mock("@/lib/db/client", () => ({
  prisma: {
    creatorProfile: { findFirst: vi.fn() },
    campaign: { findFirst: vi.fn() },
    creatorEngagement: { create: vi.fn() },
    creatorDeliverable: { findFirst: vi.fn() },
    goLiveGate: { count: vi.fn(), findMany: vi.fn() },
    operationalKillSwitch: { count: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const db = prisma as unknown as {
  creatorProfile: { findFirst: ReturnType<typeof vi.fn> };
  campaign: { findFirst: ReturnType<typeof vi.fn> };
  creatorEngagement: { create: ReturnType<typeof vi.fn> };
  creatorDeliverable: { findFirst: ReturnType<typeof vi.fn> };
  goLiveGate: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  operationalKillSwitch: { count: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

describe("bulk Phase 23-30 tenant and governance gates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not create an engagement for a creator outside the workspace", async () => {
    db.creatorProfile.findFirst.mockResolvedValue(null);
    db.campaign.findFirst.mockResolvedValue(null);

    await expect(
      createCreatorEngagement("ws-a", {
        creatorId: "11111111-1111-4111-8111-111111111111",
        brief: { objective: "test" },
        currency: "EUR",
      }),
    ).rejects.toThrow("CREATOR_NOT_FOUND");

    expect(db.creatorProfile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workspaceId: "ws-a" }),
      }),
    );
    expect(db.creatorEngagement.create).not.toHaveBeenCalled();
  });

  it("requires rights approval before approving a deliverable", async () => {
    await expect(
      reviewCreatorDeliverable("ws-a", {
        deliverableId: "22222222-2222-4222-8222-222222222222",
        decision: "APPROVED",
        rightsApproved: false,
      }),
    ).rejects.toThrow("RIGHTS_APPROVAL_REQUIRED");
    expect(db.creatorDeliverable.findFirst).not.toHaveBeenCalled();
  });

  it("blocks go-live while a required gate fails", async () => {
    db.goLiveGate.count.mockResolvedValue(1);
    db.operationalKillSwitch.count.mockResolvedValue(0);
    db.goLiveGate.findMany.mockResolvedValue([
      { gateKey: "migration", status: "FAIL", required: true },
    ]);

    const readiness = await evaluateGoLiveReadiness("ws-a");
    expect(readiness.ready).toBe(false);
    expect(readiness.blockingGates).toBe(1);
    expect(db.goLiveGate.count).toHaveBeenCalledWith({
      where: {
        workspaceId: "ws-a",
        required: true,
        status: { in: ["PENDING", "FAIL"] },
      },
    });
  });

  it("blocks go-live while any kill switch is active", async () => {
    db.goLiveGate.count.mockResolvedValue(0);
    db.operationalKillSwitch.count.mockResolvedValue(1);
    db.goLiveGate.findMany.mockResolvedValue([
      { gateKey: "migration", status: "PASS", required: true },
    ]);

    const readiness = await evaluateGoLiveReadiness("ws-a");
    expect(readiness.ready).toBe(false);
    expect(readiness.activeKillSwitches).toBe(1);
  });
});
