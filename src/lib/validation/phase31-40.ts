import { z } from "zod";

const evidenceStatus = z.enum(["PENDING", "PASS", "FAIL", "WAIVED"]);

export const growthExperimentSchema = z.object({
  name: z.string().trim().min(1).max(200),
  hypothesis: z.string().trim().min(10).max(4000),
  primaryMetric: z.string().trim().min(1).max(100),
  budgetLimit: z.number().nonnegative().max(1_000_000),
  currency: z.string().trim().length(3).default("EUR"),
  stopRule: z.string().trim().min(5).max(2000),
  ownerId: z.string().trim().max(200).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
}).refine((value) => !value.startsAt || !value.endsAt || value.endsAt > value.startsAt, {
  path: ["endsAt"],
  message: "Das Enddatum muss nach dem Startdatum liegen.",
});

export const localizationProjectSchema = z.object({
  sourceEntityType: z.string().trim().min(1).max(100),
  sourceEntityId: z.string().trim().min(1).max(200),
  marketCode: z.string().trim().min(2).max(10),
  languageCode: z.string().trim().min(2).max(12),
  content: z.record(z.string(), z.unknown()),
  disclosureSnapshot: z.record(z.string(), z.unknown()).optional(),
  culturalQaNotes: z.string().trim().max(4000).optional(),
});

export const syndicationSchema = z.object({
  sourceEntityType: z.string().trim().min(1).max(100),
  sourceEntityId: z.string().trim().min(1).max(200),
  destinationType: z.string().trim().min(1).max(100),
  destinationId: z.string().trim().min(1).max(200),
  idempotencyKey: z.string().trim().min(8).max(200),
  rightsEvidenceRef: z.string().trim().min(1).max(1000),
});

export const attributionTouchpointSchema = z.object({
  pseudonymousKey: z.string().trim().min(8).max(200),
  source: z.string().trim().min(1).max(100),
  channel: z.string().trim().min(1).max(100),
  campaignId: z.string().uuid().optional(),
  eventType: z.string().trim().min(1).max(100),
  eventValue: z.number().optional(),
  currency: z.string().trim().length(3).optional(),
  confidence: z.number().min(0).max(1),
  observedAt: z.coerce.date(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const financialForecastSchema = z.object({
  name: z.string().trim().min(1).max(200),
  scenario: z.enum(["DOWNSIDE", "BASE", "UPSIDE", "STRESS"]),
  horizonDays: z.number().int().min(1).max(1825),
  modelVersion: z.string().trim().min(1).max(100),
  assumptions: z.record(z.string(), z.unknown()),
  projectedRevenue: z.number(),
  projectedCost: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
});

export const brandAssetSchema = z.object({
  name: z.string().trim().min(1).max(200),
  assetType: z.string().trim().min(1).max(100),
  reference: z.string().trim().min(1).max(1000),
  checksum: z.string().trim().max(200).optional(),
  provenance: z.string().trim().min(3).max(2000),
  licenseEvidenceRef: z.string().trim().min(1).max(1000),
  usageConstraints: z.record(z.string(), z.unknown()).optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
});

export const partnerConnectionSchema = z.object({
  partnerKey: z.string().trim().min(2).max(100),
  displayName: z.string().trim().min(1).max(200),
  scopes: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
  credentialRef: z.string().trim().max(500).optional(),
  expiresAt: z.coerce.date().optional(),
});

export const governedExportSchema = z.object({
  purpose: z.string().trim().min(5).max(1000),
  lawfulBasis: z.string().trim().min(2).max(100),
  dataClasses: z.array(z.string().trim().min(1).max(100)).min(1).max(100),
  retentionDays: z.number().int().min(1).max(3650),
});

export const reliabilityIncidentSchema = z.object({
  title: z.string().trim().min(3).max(300),
  severity: z.enum(["SEV1", "SEV2", "SEV3", "SEV4"]),
  scopeType: z.string().trim().min(1).max(100),
  scopeId: z.string().trim().max(200).optional(),
  runbookReference: z.string().trim().min(1).max(1000),
  summary: z.string().trim().min(5).max(4000),
});

export const resolveIncidentSchema = z.object({
  id: z.string().uuid(),
  evidenceReference: z.string().trim().min(1).max(1000),
});

export const scaleGateSchema = z.object({
  gateKey: z.string().trim().min(3).max(150),
  regionCode: z.string().trim().min(2).max(10),
  status: evidenceStatus,
  required: z.boolean().default(true),
  evidenceReference: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(4000).optional(),
}).superRefine((value, context) => {
  if ((value.status === "PASS" || value.status === "WAIVED") && !value.evidenceReference) {
    context.addIssue({
      code: "custom",
      path: ["evidenceReference"],
      message: "PASS oder WAIVED benötigt belastbare Evidenz.",
    });
  }
});


export const initializeScaleGatesSchema = z.object({
  regionCodes: z
    .array(z.string().trim().min(2).max(10))
    .min(1)
    .max(25)
    .transform((values) => [...new Set(values.map((value) => value.toUpperCase()))]),
});
