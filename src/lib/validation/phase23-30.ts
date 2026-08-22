import { z } from "zod";

export const audienceContactSchema = z.object({
  pseudonymousKey: z.string().trim().min(8).max(200),
  displayName: z.string().trim().max(200).optional(),
  email: z.string().email().max(320).optional(),
  phone: z.string().trim().min(5).max(40).optional(),
  lawfulBasis: z.enum(["CONSENT", "CONTRACT", "LEGITIMATE_INTEREST"]),
  marketingConsent: z.boolean().default(false),
  consentEvidenceRef: z.string().trim().max(500).optional(),
  consentedAt: z.coerce.date().optional(),
  retentionUntil: z.coerce.date().optional(),
}).superRefine((value, context) => {
  if (value.marketingConsent && !value.consentEvidenceRef) {
    context.addIssue({
      code: "custom",
      path: ["consentEvidenceRef"],
      message: "Marketing-Einwilligung benötigt einen Nachweis.",
    });
  }
});

export const creatorProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(200),
  countryCode: z.string().trim().length(2).optional(),
  languageCodes: z.array(z.string().trim().min(2).max(12)).max(20).default([]),
  capabilityTags: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
  platformHandles: z.record(z.string(), z.string()).optional(),
  rateCard: z.record(z.string(), z.unknown()).optional(),
});

export const creatorEngagementSchema = z.object({
  creatorId: z.string().uuid(),
  campaignId: z.string().uuid().optional(),
  brief: z.record(z.string(), z.unknown()),
  agreedAmount: z.number().nonnegative().optional(),
  currency: z.string().trim().length(3).default("EUR"),
  dueAt: z.coerce.date().optional(),
});

export const complianceEvidenceSchema = z.object({
  entityType: z.string().trim().min(1).max(100),
  entityId: z.string().trim().min(1).max(200),
  evidenceKind: z.string().trim().min(1).max(100),
  reference: z.string().trim().min(1).max(1000),
  checksum: z.string().trim().max(200).optional(),
  expiresAt: z.coerce.date().optional(),
});

export const executiveObjectiveSchema = z.object({
  title: z.string().trim().min(1).max(300),
  metricKey: z.string().trim().min(1).max(100),
  targetValue: z.number(),
  currentValue: z.number().optional(),
  riskTolerance: z.enum(["conservative", "base", "growth"]).default("conservative"),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});

export const killSwitchSchema = z.object({
  scopeType: z.string().trim().min(1).max(100),
  scopeId: z.string().trim().max(200).optional(),
  reason: z.string().trim().min(3).max(2000),
});

export const goLiveGateSchema = z.object({
  gateKey: z.string().trim().min(3).max(150),
  status: z.enum(["PENDING", "PASS", "FAIL", "WAIVED"]),
  required: z.boolean().default(true),
  evidenceReference: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(4000).optional(),
}).superRefine((value, context) => {
  if ((value.status === "PASS" || value.status === "WAIVED") && !value.evidenceReference) {
    context.addIssue({
      code: "custom",
      path: ["evidenceReference"],
      message: "Bestanden oder Waiver benötigt einen Nachweis.",
    });
  }
});


export const creatorDeliverableSchema = z.object({
  engagementId: z.string().uuid(),
  mediaAssetId: z.string().uuid().optional(),
  version: z.number().int().positive().default(1),
  notes: z.string().trim().max(4000).optional(),
});

export const creatorDeliverableReviewSchema = z.object({
  deliverableId: z.string().uuid(),
  decision: z.enum(["APPROVED", "CHANGES_REQUESTED", "REJECTED"]),
  rightsApproved: z.boolean(),
  notes: z.string().trim().max(4000).optional(),
}).superRefine((value, context) => {
  if (value.decision === "APPROVED" && !value.rightsApproved) {
    context.addIssue({
      code: "custom",
      path: ["rightsApproved"],
      message: "Abnahme benötigt bestätigte Nutzungsrechte.",
    });
  }
});
