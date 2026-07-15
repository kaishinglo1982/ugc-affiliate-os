/**
 * Content intelligence profile: validation, confidence classification, and the
 * manual-over-automatic precedence rule. A manually classified profile can never
 * be overwritten by an automatic (rule-engine or AI) analysis — new analyses
 * only supersede older automatic ones, and every change is versioned (a new row
 * with `supersededByProfileId`), never an in-place mutation of a settled value.
 */
import { z } from "zod";

export const hookTypeSchema = z.enum([
  "PROBLEM",
  "QUESTION",
  "SHOCK",
  "CURIOSITY",
  "BENEFIT",
  "COMPARISON",
  "DEMONSTRATION",
  "TESTIMONIAL",
  "STORY",
  "URGENCY",
  "AUTHORITY",
  "CONTRARIAN",
]);

export const scriptStructureSchema = z.enum([
  "HOOK_PROBLEM_SOLUTION_CTA",
  "HOOK_DEMO_PROOF_CTA",
  "STORY_PROBLEM_SOLUTION",
  "COMPARISON_RECOMMENDATION",
  "LISTICLE",
  "BEFORE_AFTER",
  "TESTIMONIAL",
  "TUTORIAL",
  "UNBOXING",
  "REVIEW",
]);

export const callToActionSchema = z.enum([
  "CLICK_LINK",
  "BUY_NOW",
  "LEARN_MORE",
  "SAVE_POST",
  "FOLLOW",
  "COMMENT",
  "SHARE",
  "VISIT_PROFILE",
  "NONE",
]);

export const contentIntelligenceProfileSchema = z.object({
  workspaceId: z.string().min(1),
  contentAssetId: z.string().uuid(),
  contentVariantId: z.string().uuid().optional().nullable(),
  language: z.string().min(1),
  durationSeconds: z.union([z.number(), z.string()]).optional().nullable(),
  aspectRatio: z.string().optional().nullable(),
  contentFormat: z.string().optional().nullable(),
  hookType: hookTypeSchema.optional().nullable(),
  scriptStructure: scriptStructureSchema.optional().nullable(),
  callToActionType: callToActionSchema.optional().nullable(),
  visualStyle: z.string().optional().nullable(),
  voiceStyle: z.string().optional().nullable(),
  pacing: z.enum(["slow", "medium", "fast"]).optional().nullable(),
  sentiment: z.enum(["negative", "neutral", "positive", "mixed"]).optional().nullable(),
  productMentionCount: z.number().int().min(0).default(0),
  affiliateDisclosurePresent: z.boolean().default(false),
  subtitlePresent: z.boolean().default(false),
  faceVisible: z.boolean().optional().nullable(),
  avatarUsed: z.boolean().optional().nullable(),
  analysisSource: z.enum(["MANUAL", "RULE_ENGINE", "AI"]),
  modelReference: z.string().optional().nullable(),
  confidenceScore: z.number().min(0).max(1).optional().nullable(),
  analyzedAt: z.date().optional(),
});

export type ContentIntelligenceProfileInput = z.infer<typeof contentIntelligenceProfileSchema>;

export function classifyConfidence(score: number | null): "low" | "medium" | "high" | "unknown" {
  if (score === null || score === undefined) return "unknown";
  if (score < 0.5) return "low";
  if (score < 0.8) return "medium";
  return "high";
}

/** A manual classification must never be overwritten by an automatic one. */
export function canSupersede(existingSource: "MANUAL" | "RULE_ENGINE" | "AI", newSource: "MANUAL" | "RULE_ENGINE" | "AI"): boolean {
  if (existingSource === "MANUAL") return newSource === "MANUAL";
  return true;
}
