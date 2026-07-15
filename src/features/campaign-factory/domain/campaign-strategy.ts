import { z } from "zod";
import type {
  CampaignStrategyStatus,
  CampaignAudienceStatus,
  CampaignObjective,
  CampaignPrimaryMetric,
  CampaignRiskLevel,
  SocialPlatform,
} from "@/generated/prisma/client";

export const CAMPAIGN_STRATEGY_STATUSES = [
  "draft",
  "under_review",
  "approved",
  "rejected",
  "superseded",
  "archived",
] as const;

const STRATEGY_TRANSITIONS: Record<CampaignStrategyStatus, CampaignStrategyStatus[]> = {
  draft: ["under_review", "superseded", "archived"],
  under_review: ["approved", "rejected", "draft", "superseded", "archived"],
  approved: ["superseded", "archived"],
  rejected: ["draft", "superseded", "archived"],
  superseded: ["archived"],
  archived: [],
};

export function canTransitionStrategy(
  from: CampaignStrategyStatus,
  to: CampaignStrategyStatus,
): { ok: boolean; reason?: string } {
  if (from === to) return { ok: true };
  const allowed = STRATEGY_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    return { ok: false, reason: `Statuswechsel von ${from} nach ${to} ist nicht erlaubt.` };
  }
  return { ok: true };
}

export const CAMPAIGN_AUDIENCE_STATUSES = ["draft", "approved", "rejected", "archived"] as const;

const AUDIENCE_TRANSITIONS: Record<CampaignAudienceStatus, CampaignAudienceStatus[]> = {
  draft: ["approved", "rejected", "archived"],
  approved: ["draft", "archived"],
  rejected: ["draft", "archived"],
  archived: ["draft"],
};

export function canTransitionAudience(
  from: CampaignAudienceStatus,
  to: CampaignAudienceStatus,
): { ok: boolean; reason?: string } {
  if (from === to) return { ok: true };
  const allowed = AUDIENCE_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    return { ok: false, reason: `Statuswechsel von ${from} nach ${to} ist nicht erlaubt.` };
  }
  return { ok: true };
}

export const CAMPAIGN_OBJECTIVES = [
  "traffic",
  "affiliate_clicks",
  "conversions",
  "revenue",
  "content_testing",
] as const;

export const CAMPAIGN_PRIMARY_METRICS = [
  "views",
  "clicks",
  "ctr",
  "conversions",
  "conversion_rate",
  "commission_revenue",
  "estimated_net_revenue",
  "return_on_content_spend",
] as const;

export const CAMPAIGN_RISK_LEVELS = ["low", "medium", "high", "critical"] as const;

export const createStrategySchema = z.object({
  campaignCandidateId: z.string().min(1),
  name: z.string().min(1).max(160),
  objective: z.enum(CAMPAIGN_OBJECTIVES),
  primarySuccessMetric: z.enum(CAMPAIGN_PRIMARY_METRICS),
  description: z.string().max(4000).optional(),
  targetPlatforms: z.array(z.string()).max(20).optional(),
  targetCountryCodes: z.array(z.string()).max(50).optional(),
  languageCode: z.string().min(2).max(8).optional(),
  targetAudienceProfileId: z.string().min(1).optional(),
  campaignDurationDays: z.number().int().positive().optional(),
  plannedContentCount: z.number().int().positive().optional(),
  estimatedBudget: z.union([z.number(), z.string()]).optional(),
  currency: z.string().min(3).max(3).optional(),
  riskLevel: z.enum(CAMPAIGN_RISK_LEVELS).optional(),
});

export type CreateStrategyInput = z.infer<typeof createStrategySchema>;

export const updateStrategySchema = z.object({
  name: z.string().min(1).max(160).optional(),
  objective: z.enum(CAMPAIGN_OBJECTIVES).optional(),
  primarySuccessMetric: z.enum(CAMPAIGN_PRIMARY_METRICS).optional(),
  description: z.string().max(4000).optional(),
  targetPlatforms: z.array(z.string()).max(20).optional(),
  targetCountryCodes: z.array(z.string()).max(50).optional(),
  languageCode: z.string().min(2).max(8).optional(),
  targetAudienceProfileId: z.string().min(1).optional(),
  campaignDurationDays: z.number().int().positive().optional(),
  plannedContentCount: z.number().int().positive().optional(),
  estimatedBudget: z.union([z.number(), z.string()]).optional(),
  currency: z.string().min(3).max(3).optional(),
  riskLevel: z.enum(CAMPAIGN_RISK_LEVELS).optional(),
});

export type UpdateStrategyInput = z.infer<typeof updateStrategySchema>;

export const requestStrategyApprovalSchema = z.object({
  note: z.string().max(2000).optional(),
});

export const decideStrategySchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().max(2000).optional(),
});

export type DecideStrategyInput = z.infer<typeof decideStrategySchema>;

export function isStrategyApproved(status: CampaignStrategyStatus): boolean {
  return status === "approved";
}

export type StrategyStatus = CampaignStrategyStatus;
export type AudienceStatus = CampaignAudienceStatus;
export type Objective = CampaignObjective;
export type PrimaryMetric = CampaignPrimaryMetric;
export type RiskLevel = CampaignRiskLevel;
export type Platform = SocialPlatform;
