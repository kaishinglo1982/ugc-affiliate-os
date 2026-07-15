import { z } from "zod";
import { CAMPAIGN_RISK_LEVELS } from "@/features/campaign-factory/domain/campaign-strategy";
import type { CreativeAngleStatus, CreativeAngleType } from "@/generated/prisma/client";

export const CREATIVE_ANGLE_TYPES = [
  "problem_solution",
  "product_demo",
  "comparison",
  "testimonial",
  "before_after",
  "tutorial",
  "review",
  "unboxing",
  "listicle",
  "story",
  "authority",
  "contrarian",
  "urgency",
  "benefit",
  "faq",
  "myth_busting",
] as const;

const ANGLE_TRANSITIONS: Record<CreativeAngleStatus, CreativeAngleStatus[]> = {
  draft: ["approved", "rejected", "archived"],
  approved: ["draft", "archived"],
  rejected: ["draft", "archived"],
  archived: ["draft"],
};

export function canTransitionAngle(
  from: CreativeAngleStatus,
  to: CreativeAngleStatus,
): { ok: boolean; reason?: string } {
  if (from === to) return { ok: true };
  const allowed = ANGLE_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    return { ok: false, reason: `Statuswechsel von ${from} nach ${to} ist nicht erlaubt.` };
  }
  return { ok: true };
}

export const createAngleSchema = z.object({
  campaignStrategyId: z.string().min(1),
  name: z.string().min(1).max(160),
  angleType: z.enum(CREATIVE_ANGLE_TYPES),
  description: z.string().min(1).max(4000),
  coreMessage: z.string().min(1).max(2000),
  targetProblem: z.string().max(2000).optional(),
  desiredOutcome: z.string().max(2000).optional(),
  proofStrategy: z.string().max(2000).optional(),
  objectionHandled: z.string().max(2000).optional(),
  suitablePlatforms: z.array(z.string()).max(20).optional(),
  suitableFormats: z.array(z.string()).max(20).optional(),
  recommendedHookTypes: z.array(z.string()).max(20).optional(),
  recommendedScriptStructures: z.array(z.string()).max(20).optional(),
  riskLevel: z.enum(CAMPAIGN_RISK_LEVELS).optional(),
});

export type CreateAngleInput = z.infer<typeof createAngleSchema>;

export const updateAngleSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  angleType: z.enum(CREATIVE_ANGLE_TYPES).optional(),
  description: z.string().min(1).max(4000).optional(),
  coreMessage: z.string().min(1).max(2000).optional(),
  targetProblem: z.string().max(2000).optional(),
  desiredOutcome: z.string().max(2000).optional(),
  proofStrategy: z.string().max(2000).optional(),
  objectionHandled: z.string().max(2000).optional(),
  suitablePlatforms: z.array(z.string()).max(20).optional(),
  suitableFormats: z.array(z.string()).max(20).optional(),
  recommendedHookTypes: z.array(z.string()).max(20).optional(),
  recommendedScriptStructures: z.array(z.string()).max(20).optional(),
  riskLevel: z.enum(CAMPAIGN_RISK_LEVELS).optional(),
});

export type UpdateAngleInput = z.infer<typeof updateAngleSchema>;

export const decideAngleSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().max(2000).optional(),
});

export type DecideAngleInput = z.infer<typeof decideAngleSchema>;

export function isAngleApproved(status: CreativeAngleStatus): boolean {
  return status === "approved";
}

export type AngleStatus = CreativeAngleStatus;
export type AngleType = CreativeAngleType;
