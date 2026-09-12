import "server-only";
import { prisma } from "@/lib/db/client";
import { Prisma } from "@/generated/prisma/client";

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function createGrowthExperiment(
  workspaceId: string,
  input: {
    name: string;
    hypothesis: string;
    primaryMetric: string;
    budgetLimit: number;
    currency: string;
    stopRule: string;
    ownerId?: string;
    startsAt?: Date;
    endsAt?: Date;
  },
) {
  return prisma.growthExperimentPlan.create({ data: { workspaceId, ...input } });
}

export async function createLocalizationProject(
  workspaceId: string,
  input: {
    sourceEntityType: string;
    sourceEntityId: string;
    marketCode: string;
    languageCode: string;
    content: unknown;
    disclosureSnapshot?: unknown;
    culturalQaNotes?: string;
  },
) {
  return prisma.localizationProject.create({
    data: {
      workspaceId,
      ...input,
      content: json(input.content),
      disclosureSnapshot: input.disclosureSnapshot
        ? json(input.disclosureSnapshot)
        : undefined,
    },
  });
}

export async function queueSyndication(
  workspaceId: string,
  input: {
    sourceEntityType: string;
    sourceEntityId: string;
    destinationType: string;
    destinationId: string;
    idempotencyKey: string;
    rightsEvidenceRef: string;
  },
) {
  const blocked = await prisma.operationalKillSwitch.count({
    where: {
      workspaceId,
      active: true,
      OR: [
        { scopeType: "GLOBAL" },
        { scopeType: "DISTRIBUTION" },
        { scopeType: "DESTINATION", scopeId: input.destinationId },
      ],
    },
  });
  if (blocked > 0) throw new Error("DISTRIBUTION_KILL_SWITCH_ACTIVE");

  return prisma.distributionSyndication.upsert({
    where: {
      workspaceId_idempotencyKey: {
        workspaceId,
        idempotencyKey: input.idempotencyKey,
      },
    },
    create: { workspaceId, ...input },
    update: {},
  });
}

export async function recordAttributionTouchpoint(
  workspaceId: string,
  input: {
    pseudonymousKey: string;
    source: string;
    channel: string;
    campaignId?: string;
    eventType: string;
    eventValue?: number;
    currency?: string;
    confidence: number;
    observedAt: Date;
    metadata?: unknown;
  },
) {
  if (input.campaignId) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: input.campaignId, workspaceId },
      select: { id: true },
    });
    if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");
  }
  return prisma.attributionTouchpoint.create({
    data: {
      workspaceId,
      ...input,
      metadata: input.metadata ? json(input.metadata) : undefined,
    },
  });
}

export async function createFinancialForecast(
  workspaceId: string,
  input: {
    name: string;
    scenario: "DOWNSIDE" | "BASE" | "UPSIDE" | "STRESS";
    horizonDays: number;
    modelVersion: string;
    assumptions: unknown;
    projectedRevenue: number;
    projectedCost: number;
    confidence: number;
  },
) {
  return prisma.financialForecast.create({
    data: { workspaceId, ...input, assumptions: json(input.assumptions) },
  });
}

export async function registerBrandAsset(
  workspaceId: string,
  input: {
    name: string;
    assetType: string;
    reference: string;
    checksum?: string;
    provenance: string;
    licenseEvidenceRef: string;
    usageConstraints?: unknown;
    validFrom?: Date;
    validUntil?: Date;
  },
) {
  return prisma.brandAssetRegistry.create({
    data: {
      workspaceId,
      ...input,
      usageConstraints: input.usageConstraints
        ? json(input.usageConstraints)
        : undefined,
    },
  });
}

export async function createPartnerConnection(
  workspaceId: string,
  input: {
    partnerKey: string;
    displayName: string;
    scopes: string[];
    credentialRef?: string;
    expiresAt?: Date;
  },
) {
  return prisma.partnerConnection.create({
    data: { workspaceId, ...input },
    select: {
      id: true,
      workspaceId: true,
      partnerKey: true,
      displayName: true,
      scopes: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function requestGovernedDataExport(
  workspaceId: string,
  actor: string,
  input: {
    purpose: string;
    lawfulBasis: string;
    dataClasses: string[];
    retentionDays: number;
  },
) {
  return prisma.governedDataExport.create({
    data: { workspaceId, requestedBy: actor, ...input },
  });
}

export async function openReliabilityIncident(
  workspaceId: string,
  input: {
    title: string;
    severity: "SEV1" | "SEV2" | "SEV3" | "SEV4";
    scopeType: string;
    scopeId?: string;
    runbookReference: string;
    summary: string;
  },
) {
  return prisma.reliabilityIncident.create({ data: { workspaceId, ...input } });
}

export async function resolveReliabilityIncident(
  id: string,
  workspaceId: string,
  evidenceReference: string,
) {
  const result = await prisma.reliabilityIncident.updateMany({
    where: {
      id,
      workspaceId,
      status: { in: ["OPEN", "MITIGATING", "MONITORING"] },
    },
    data: {
      status: "RESOLVED",
      evidenceReference,
      resolvedAt: new Date(),
    },
  });
  if (result.count !== 1) throw new Error("INCIDENT_NOT_FOUND");
  return prisma.reliabilityIncident.findFirst({ where: { id, workspaceId } });
}

export async function setScaleCertificationGate(
  workspaceId: string,
  actor: string,
  input: {
    gateKey: string;
    regionCode: string;
    status: "PENDING" | "PASS" | "FAIL" | "WAIVED";
    required: boolean;
    evidenceReference?: string;
    notes?: string;
  },
) {
  return prisma.scaleCertificationGate.upsert({
    where: {
      workspaceId_gateKey_regionCode: {
        workspaceId,
        gateKey: input.gateKey,
        regionCode: input.regionCode,
      },
    },
    create: {
      workspaceId,
      ...input,
      checkedBy: actor,
      checkedAt: new Date(),
    },
    update: {
      status: input.status,
      required: input.required,
      evidenceReference: input.evidenceReference,
      notes: input.notes,
      checkedBy: actor,
      checkedAt: new Date(),
    },
  });
}

export async function evaluateScaleReadiness(workspaceId: string) {
  const [
    phase30Blocking,
    phase30GateCount,
    scaleBlocking,
    scaleGateCount,
    activeKillSwitches,
    criticalIncidents,
    phase30Gates,
    scaleGates,
    killSwitchRecords,
    incidentRecords,
  ] = await Promise.all([
    prisma.goLiveGate.count({
      where: { workspaceId, required: true, status: { in: ["PENDING", "FAIL"] } },
    }),
    prisma.goLiveGate.count({ where: { workspaceId } }),
    prisma.scaleCertificationGate.count({
      where: { workspaceId, required: true, status: { in: ["PENDING", "FAIL"] } },
    }),
    prisma.scaleCertificationGate.count({ where: { workspaceId } }),
    prisma.operationalKillSwitch.count({ where: { workspaceId, active: true } }),
    prisma.reliabilityIncident.count({
      where: {
        workspaceId,
        severity: { in: ["SEV1", "SEV2"] },
        status: { in: ["OPEN", "MITIGATING", "MONITORING"] },
      },
    }),
    prisma.goLiveGate.findMany({
      where: { workspaceId },
      orderBy: { gateKey: "asc" },
    }),
    prisma.scaleCertificationGate.findMany({
      where: { workspaceId },
      orderBy: [{ regionCode: "asc" }, { gateKey: "asc" }],
    }),
    prisma.operationalKillSwitch.findMany({
      where: { workspaceId, active: true },
      orderBy: { activatedAt: "desc" },
      take: 25,
      select: {
        id: true,
        scopeType: true,
        scopeId: true,
        reason: true,
        activatedBy: true,
        activatedAt: true,
      },
    }),
    prisma.reliabilityIncident.findMany({
      where: {
        workspaceId,
        status: { in: ["OPEN", "MITIGATING", "MONITORING"] },
      },
      orderBy: [{ severity: "asc" }, { openedAt: "desc" }],
      take: 25,
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        scopeType: true,
        scopeId: true,
        runbookReference: true,
        summary: true,
        openedAt: true,
      },
    }),
  ]);

  return {
    ready:
      phase30GateCount > 0 &&
      scaleGateCount > 0 &&
      phase30Blocking === 0 &&
      scaleBlocking === 0 &&
      activeKillSwitches === 0 &&
      criticalIncidents === 0,
    phase30Blocking,
    scaleBlocking,
    activeKillSwitches,
    criticalIncidents,
    goLiveGates: phase30Gates,
    gates: scaleGates,
    killSwitches: killSwitchRecords,
    incidents: incidentRecords,
  };
}

export const PHASE_30_GATE_KEYS = [
  "database_migration",
  "tenant_rbac_vault_api_security",
  "quality_suite",
  "load_retry_dlq_provider_failover",
  "slo_observability",
  "backup_restore_disaster_recovery",
  "compliance_privacy_finance_review",
  "canary_rollout",
] as const;

export const PHASE_40_GATE_KEYS = [
  "regional_legal_tax_disclosure",
  "platform_policy",
  "regional_load_slo",
  "unit_economics_worst_case_cost",
  "partner_scope_export_revocation",
  "regional_restore_dr",
  "incident_response_exercise",
  "regional_canary",
] as const;

export async function initializeReadinessGates(
  workspaceId: string,
  actor: string,
  regionCodes: string[],
) {
  const normalizedRegions = [...new Set(regionCodes.map((region) => region.toUpperCase()))];
  if (normalizedRegions.length === 0) throw new Error("REGION_REQUIRED");

  const [phase30, phase40] = await prisma.$transaction([
    prisma.goLiveGate.createMany({
      data: PHASE_30_GATE_KEYS.map((gateKey) => ({
        workspaceId,
        gateKey,
        status: "PENDING" as const,
        required: true,
        notes: "Initialisiert; belastbare Evidenz erforderlich.",
        checkedBy: actor,
        checkedAt: new Date(),
      })),
      skipDuplicates: true,
    }),
    prisma.scaleCertificationGate.createMany({
      data: normalizedRegions.flatMap((regionCode) =>
        PHASE_40_GATE_KEYS.map((gateKey) => ({
          workspaceId,
          gateKey,
          regionCode,
          status: "PENDING" as const,
          required: true,
          notes: "Initialisiert; regionale Evidenz erforderlich.",
          checkedBy: actor,
          checkedAt: new Date(),
        })),
      ),
      skipDuplicates: true,
    }),
  ]);

  return {
    phase30Created: phase30.count,
    phase40Created: phase40.count,
    regions: normalizedRegions,
    readiness: await evaluateScaleReadiness(workspaceId),
  };
}
