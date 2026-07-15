/**
 * Framework-free content-fit analysis.
 *
 * A deterministic, heuristic analyzer (NO LLM / AI calls). Produces demonstrable
 * scores (0..100) and recommended hooks / script structures / formats for a
 * product. If content generation is disallowed for the category, all scores and
 * confidence collapse to 0.
 */
import type { HookType, ScriptStructureType, PublishingFormat } from "@/generated/prisma/client";
import type { RiskLevel } from "@/features/products/domain/types";

export interface ContentFitInput {
  categoryId: string | null;
  categoryAllowed: boolean;
  contentGenerationAllowed: boolean;
  historicalCategoryPerformance?: {
    avgEngagementRate: number | null;
    avgConversionRate: number | null;
  };
  demonstrabilityHint?: number;
  visualAppealHint?: number;
  problemSolutionHint?: number;
  testimonialHint?: number;
  tutorialHint?: number;
  shortVideoHint?: number;
  confidenceScore: number;
  evidence: string[];
}

export interface ContentFitResult {
  demonstrabilityScore: number;
  visualAppealScore: number;
  problemSolutionFitScore: number;
  testimonialFitScore: number;
  tutorialFitScore: number;
  shortVideoFitScore: number;
  recommendedHookTypes: HookType[];
  recommendedScriptStructures: ScriptStructureType[];
  recommendedContentFormats: PublishingFormat[];
  confidenceScore: number;
  evidenceReferences: string[];
}

const DISALLOWED_EVIDENCE = "Content generation not allowed for category";

function clamp(value: number | undefined, fallback: number): number {
  const v = value ?? fallback;
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return Math.round(v);
}

/** Categories that naturally demonstrate well on camera. */
const DEMO_FRIENDLY = new Set([
  "electronics",
  "kitchen",
  "home",
  "tools",
  "gadgets",
  "beauty",
  "fitness",
]);

function deriveBaseScores(input: ContentFitInput): {
  demonstrability: number;
  visualAppeal: number;
  problemSolution: number;
  testimonial: number;
  tutorial: number;
  shortVideo: number;
} {
  const category = (input.categoryId ?? "").toLowerCase();
  const demoBoost = DEMO_FRIENDLY.has(category) ? 15 : 0;
  const base = 50;
  return {
    demonstrability: clamp(input.demonstrabilityHint, base + demoBoost),
    visualAppeal: clamp(input.visualAppealHint, base + (category.includes("beauty") ? 10 : 0)),
    problemSolution: clamp(input.problemSolutionHint, base),
    testimonial: clamp(input.testimonialHint, base - 5),
    tutorial: clamp(input.tutorialHint, base + (DEMO_FRIENDLY.has(category) ? 10 : 0)),
    shortVideo: clamp(input.shortVideoHint, base),
  };
}

function pickHooks(s: {
  demonstrability: number;
  visualAppeal: number;
  problemSolution: number;
  testimonial: number;
}): HookType[] {
  const hooks = new Set<HookType>();
  hooks.add("CURIOSITY");
  if (s.problemSolution >= 60) {
    hooks.add("PROBLEM");
    hooks.add("STORY");
  }
  if (s.demonstrability >= 60) hooks.add("DEMONSTRATION");
  if (s.visualAppeal >= 60) {
    hooks.add("SHOCK");
    hooks.add("BENEFIT");
  }
  if (s.testimonial >= 60) hooks.add("TESTIMONIAL");
  hooks.add("BENEFIT");
  return [...hooks];
}

function pickStructures(s: {
  demonstrability: number;
  problemSolution: number;
  testimonial: number;
  tutorial: number;
  visualAppeal: number;
}): ScriptStructureType[] {
  const out: ScriptStructureType[] = [];
  if (s.demonstrability >= 60) out.push("HOOK_DEMO_PROOF_CTA");
  if (s.problemSolution >= 60) out.push("HOOK_PROBLEM_SOLUTION_CTA");
  if (s.testimonial >= 60) out.push("TESTIMONIAL");
  if (s.tutorial >= 60) out.push("TUTORIAL");
  if (s.visualAppeal >= 60) out.push("UNBOXING", "REVIEW");
  if (out.length === 0) out.push("HOOK_PROBLEM_SOLUTION_CTA");
  return out;
}

function pickFormats(s: {
  visualAppeal: number;
  shortVideo: number;
}): PublishingFormat[] {
  const out: PublishingFormat[] = ["VIDEO_SHORT", "REEL"];
  if (s.visualAppeal >= 60) out.push("STATIC_IMAGE", "IMAGE_CAROUSEL");
  if (s.shortVideo >= 60) out.push("STORY");
  return out;
}

export function analyzeContentFit(input: ContentFitInput): ContentFitResult {
  if (!input.contentGenerationAllowed || !input.categoryAllowed) {
    return {
      demonstrabilityScore: 0,
      visualAppealScore: 0,
      problemSolutionFitScore: 0,
      testimonialFitScore: 0,
      tutorialFitScore: 0,
      shortVideoFitScore: 0,
      recommendedHookTypes: [],
      recommendedScriptStructures: [],
      recommendedContentFormats: [],
      confidenceScore: 0,
      evidenceReferences: [...input.evidence, DISALLOWED_EVIDENCE],
    };
  }

  const s = deriveBaseScores(input);
  const confidence = clampConfidence(input.confidenceScore);
  const evidence = [...input.evidence];

  if (input.historicalCategoryPerformance?.avgEngagementRate != null) {
    evidence.push("historical_engagement_rate_used");
  }

  return {
    demonstrabilityScore: s.demonstrability,
    visualAppealScore: s.visualAppeal,
    problemSolutionFitScore: s.problemSolution,
    testimonialFitScore: s.testimonial,
    tutorialFitScore: s.tutorial,
    shortVideoFitScore: s.shortVideo,
    recommendedHookTypes: pickHooks(s),
    recommendedScriptStructures: pickStructures(s),
    recommendedContentFormats: pickFormats(s),
    confidenceScore: confidence,
    evidenceReferences: evidence,
  };
}

function clampConfidence(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Math.round(value * 1000) / 1000;
}

export type { RiskLevel };
