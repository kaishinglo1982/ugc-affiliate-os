import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import {
  createPartnerConnection,
  evaluateScaleReadiness,
  initializeReadinessGates,
  queueSyndication,
  recordAttributionTouchpoint,
} from "@/server/services/phase31-40";

vi.mock("@/lib/db/client", () => ({
  prisma: {
    campaign: { findFirst: vi.fn() },
    attributionTouchpoint: { create: vi.fn() },
    operationalKillSwitch: { count: vi.fn(), findMany: vi.fn() },
    distributionSyndication: { upsert: vi.fn() },
    partnerConnection: { create: vi.fn() },
    goLiveGate: { count: vi.fn(), createMany: vi.fn(), findMany: vi.fn() },
    scaleCertificationGate: { count: vi.fn(), findMany: vi.fn(), createMany: vi.fn() },
    reliabilityIncident: { count: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const db = prisma as unknown as {
  campaign: { findFirst: ReturnType<typeof vi.fn> };
  attributionTouchpoint: { create: ReturnType<typeof vi.fn> };
  operationalKillSwitch: { count: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  distributionSyndication: { upsert: ReturnType<typeof vi.fn> };
  partnerConnection: { create: ReturnType<typeof vi.fn> };
  goLiveGate: { count: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  scaleCertificationGate: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
  };
  reliabilityIncident: { count: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

describe("bulk Phase 31-40 scale and tenant gates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects attribution to a campaign outside the workspace", async () => {
    db.campaign.findFirst.mockResolvedValue(null);

    await expect(
      recordAttributionTouchpoint("ws-a", {
        pseudonymousKey: "anonymous-123",
        source: "social",
        channel: "video",
        campaignId: "11111111-1111-4111-8111-111111111111",
        eventType: "conversion",
        confidence: 0.8,
        observedAt: new Date(),
      }),
    ).rejects.toThrow("CAMPAIGN_NOT_FOUND");

    expect(db.campaign.findFirst).toHaveBeenCalledWith({
      where: {
        id: "11111111-1111-4111-8111-111111111111",
        workspaceId: "ws-a",
      },
      select: { id: true },
    });
    expect(db.attributionTouchpoint.create).not.toHaveBeenCalled();
  });

  it("blocks distribution while a matching kill switch is active", async () => {
    db.operationalKillSwitch.count.mockResolvedValue(1);

    await expect(
      queueSyndication("ws-a", {
        sourceEntityType: "MediaAsset",
        sourceEntityId: "asset-a",
        destinationType: "SOCIAL",
        destinationId: "account-a",
        idempotencyKey: "delivery-123",
        rightsEvidenceRef: "evidence://rights/1",
      }),
    ).rejects.toThrow("DISTRIBUTION_KILL_SWITCH_ACTIVE");

    expect(db.distributionSyndication.upsert).not.toHaveBeenCalled();
  });

  it("never returns a partner credential reference", async () => {
    db.partnerConnection.create.mockResolvedValue({
      id: "partner-a",
      workspaceId: "ws-a",
      partnerKey: "network",
    });

    const partner = await createPartnerConnection("ws-a", {
      partnerKey: "network",
      displayName: "Network",
      scopes: ["offers.read"],
      credentialRef: "vault://secret",
    });

    expect(partner).not.toHaveProperty("credentialRef");
    expect(db.partnerConnection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.not.objectContaining({ credentialRef: true }),
      }),
    );
  });

  it("blocks scale certification on an open critical incident", async () => {
    db.goLiveGate.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(8);
    db.scaleCertificationGate.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(10);
    db.operationalKillSwitch.count.mockResolvedValue(0);
    db.reliabilityIncident.count.mockResolvedValue(1);
    db.goLiveGate.findMany.mockResolvedValue([]);
    db.scaleCertificationGate.findMany.mockResolvedValue([]);
    db.operationalKillSwitch.findMany.mockResolvedValue([]);
    db.reliabilityIncident.findMany.mockResolvedValue([]);

    const readiness = await evaluateScaleReadiness("ws-a");

    expect(readiness.ready).toBe(false);
    expect(readiness.criticalIncidents).toBe(1);
    expect(db.reliabilityIncident.count).toHaveBeenCalledWith({
      where: {
        workspaceId: "ws-a",
        severity: { in: ["SEV1", "SEV2"] },
        status: { in: ["OPEN", "MITIGATING", "MONITORING"] },
      },
    });
  });
  it("initializes phase 30 and regional phase 40 gates idempotently", async () => {
    db.goLiveGate.createMany.mockReturnValue({ operation: "phase30" });
    db.scaleCertificationGate.createMany.mockReturnValue({ operation: "phase40" });
    db.$transaction.mockResolvedValue([{ count: 8 }, { count: 16 }]);
    db.goLiveGate.count
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(8);
    db.scaleCertificationGate.count
      .mockResolvedValueOnce(16)
      .mockResolvedValueOnce(16);
    db.operationalKillSwitch.count.mockResolvedValue(0);
    db.reliabilityIncident.count.mockResolvedValue(0);
    db.goLiveGate.findMany.mockResolvedValue([]);
    db.scaleCertificationGate.findMany.mockResolvedValue([]);
    db.operationalKillSwitch.findMany.mockResolvedValue([]);
    db.reliabilityIncident.findMany.mockResolvedValue([]);

    const result = await initializeReadinessGates(
      "ws-a",
      "owner@example.com",
      ["de", "DE", "AT"],
    );

    expect(result.phase30Created).toBe(8);
    expect(result.phase40Created).toBe(16);
    expect(result.regions).toEqual(["DE", "AT"]);
    expect(db.goLiveGate.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
    expect(db.scaleCertificationGate.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ workspaceId: "ws-a", regionCode: "DE" }),
          expect.objectContaining({ workspaceId: "ws-a", regionCode: "AT" }),
        ]),
        skipDuplicates: true,
      }),
    );
  });
});
