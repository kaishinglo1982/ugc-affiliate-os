import "server-only";
import { prisma } from "@/lib/db/client";
import { Prisma } from "@/generated/prisma/client";

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function createAudienceContact(
  workspaceId: string,
  input: {
    pseudonymousKey: string;
    displayName?: string;
    email?: string;
    phone?: string;
    lawfulBasis: "CONSENT" | "CONTRACT" | "LEGITIMATE_INTEREST";
    marketingConsent: boolean;
    consentEvidenceRef?: string;
    consentedAt?: Date;
    retentionUntil?: Date;
  },
) {
  return prisma.audienceContact.create({ data: { workspaceId, ...input } });
}

export async function createCreatorProfile(
  workspaceId: string,
  input: {
    displayName: string;
    countryCode?: string;
    languageCodes: string[];
    capabilityTags: string[];
    platformHandles?: unknown;
    rateCard?: unknown;
  },
) {
  return prisma.creatorProfile.create({
    data: {
      workspaceId,
      displayName: input.displayName,
      countryCode: input.countryCode,
      languageCodes: input.languageCodes,
      capabilityTags: input.capabilityTags,
      platformHandles: input.platformHandles ? json(input.platformHandles) : undefined,
      rateCard: input.rateCard ? json(input.rateCard) : undefined,
    },
  });
}

export async function createCreatorEngagement(
  workspaceId: string,
  input: {
    creatorId: string;
    campaignId?: string;
    brief: unknown;
    agreedAmount?: number;
    currency: string;
    dueAt?: Date;
  },
) {
  const [creator, campaign] = await Promise.all([
    prisma.creatorProfile.findFirst({
      where: { id: input.creatorId, workspaceId, status: { not: "ARCHIVED" } },
      select: { id: true },
    }),
    input.campaignId
      ? prisma.campaign.findFirst({
          where: { id: input.campaignId, workspaceId },
          select: { id: true },
        })
      : null,
  ]);
  if (!creator) throw new Error("CREATOR_NOT_FOUND");
  if (input.campaignId && !campaign) throw new Error("CAMPAIGN_NOT_FOUND");

  return prisma.creatorEngagement.create({
    data: {
      workspaceId,
      creatorId: creator.id,
      campaignId: campaign?.id,
      brief: json(input.brief),
      agreedAmount: input.agreedAmount,
      currency: input.currency,
      dueAt: input.dueAt,
    },
  });
}

export async function addComplianceEvidence(
  workspaceId: string,
  actor: string,
  input: {
    entityType: string;
    entityId: string;
    evidenceKind: string;
    reference: string;
    checksum?: string;
    expiresAt?: Date;
  },
) {
  return prisma.complianceEvidence.create({
    data: { workspaceId, ...input, verifiedBy: actor, verifiedAt: new Date() },
  });
}

export async function createExecutiveObjective(
  workspaceId: string,
  input: {
    title: string;
    metricKey: string;
    targetValue: number;
    currentValue?: number;
    riskTolerance: string;
    startsAt?: Date;
    endsAt?: Date;
  },
) {
  return prisma.executiveObjective.create({ data: { workspaceId, ...input } });
}

export async function activateKillSwitch(
  workspaceId: string,
  actor: string,
  input: { scopeType: string; scopeId?: string; reason: string },
) {
  return prisma.operationalKillSwitch.create({
    data: { workspaceId, ...input, activatedBy: actor },
  });
}

export async function releaseKillSwitch(
  id: string,
  workspaceId: string,
  actor: string,
) {
  const released = await prisma.operationalKillSwitch.updateMany({
    where: { id, workspaceId, active: true },
    data: { active: false, releasedBy: actor, releasedAt: new Date() },
  });
  if (released.count !== 1) throw new Error("KILL_SWITCH_NOT_FOUND");
  return prisma.operationalKillSwitch.findFirst({ where: { id, workspaceId } });
}

export async function setGoLiveGate(
  workspaceId: string,
  actor: string,
  input: {
    gateKey: string;
    status: "PENDING" | "PASS" | "FAIL" | "WAIVED";
    required: boolean;
    evidenceReference?: string;
    notes?: string;
  },
) {
  return prisma.goLiveGate.upsert({
    where: { workspaceId_gateKey: { workspaceId, gateKey: input.gateKey } },
    create: {
      workspaceId,
      ...input,
      checkedAt: new Date(),
      checkedBy: actor,
    },
    update: {
      status: input.status,
      required: input.required,
      evidenceReference: input.evidenceReference,
      notes: input.notes,
      checkedAt: new Date(),
      checkedBy: actor,
    },
  });
}

export async function evaluateGoLiveReadiness(workspaceId: string) {
  const [blockingGates, activeKillSwitches, gates] = await Promise.all([
    prisma.goLiveGate.count({
      where: {
        workspaceId,
        required: true,
        status: { in: ["PENDING", "FAIL"] },
      },
    }),
    prisma.operationalKillSwitch.count({ where: { workspaceId, active: true } }),
    prisma.goLiveGate.findMany({
      where: { workspaceId },
      orderBy: { gateKey: "asc" },
    }),
  ]);
  return {
    ready: blockingGates === 0 && activeKillSwitches === 0 && gates.length > 0,
    blockingGates,
    activeKillSwitches,
    gates,
  };
}
