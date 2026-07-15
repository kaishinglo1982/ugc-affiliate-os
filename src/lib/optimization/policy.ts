/**
 * Optimization policy: configurable guardrails for what the system may do
 * autonomously. Defaults follow the spec — observe-only, AI disabled, and every
 * experiment / variant-draft / schedule change requires approval. The policy is
 * the single source of truth for whether a recommendation or action is allowed
 * without human sign-off.
 */
import type { OptimizationMode, RecommendationType, ScopeType } from "@/generated/prisma/client";

export interface OptimizationPolicyInput {
  workspaceId: string;
  scopeType: ScopeType;
  scopeId: string;
  mode: OptimizationMode;
  minimumSampleSize: number;
  minimumConfidenceScore: number;
  maximumRecommendationsPerDay: number;
  allowAiAnalysis: boolean;
  allowAiVariantDrafts: boolean;
  requireApprovalForExperiment: boolean;
  requireApprovalForVariantDraft: boolean;
  requireApprovalForScheduleChange: boolean;
  blockedRecommendationTypes: RecommendationType[];
}

export function defaultOptimizationPolicy(
  workspaceId: string,
  scopeType: ScopeType,
  scopeId: string,
): OptimizationPolicyInput {
  return {
    workspaceId,
    scopeType,
    scopeId,
    mode: "OBSERVE_ONLY",
    minimumSampleSize: 100,
    minimumConfidenceScore: 0.7,
    maximumRecommendationsPerDay: 20,
    allowAiAnalysis: false,
    allowAiVariantDrafts: false,
    requireApprovalForExperiment: true,
    requireApprovalForVariantDraft: true,
    requireApprovalForScheduleChange: true,
    blockedRecommendationTypes: [],
  };
}

export function isRecommendationBlocked(
  policy: OptimizationPolicyInput,
  type: RecommendationType,
): boolean {
  return policy.blockedRecommendationTypes.includes(type);
}

export function requiresApprovalForRecommendation(policy: OptimizationPolicyInput, type: RecommendationType): boolean {
  if (isRecommendationBlocked(policy, type)) return true;
  // OBSERVE_ONLY / RECOMMEND never auto-apply. Only DRAFT_VARIANTS with variant
  // draft approval disabled may auto-create drafts; everything else needs a human.
  if (policy.mode !== "DRAFT_VARIANTS") return true;
  return policy.requireApprovalForVariantDraft;
}

export function canAutoApplyVariantDraft(policy: OptimizationPolicyInput): boolean {
  return policy.mode === "DRAFT_VARIANTS" && !policy.requireApprovalForVariantDraft && policy.allowAiVariantDrafts;
}

export function meetsMinimumEvidence(policy: OptimizationPolicyInput, sampleSize: bigint, confidence: number): boolean {
  return sampleSize >= BigInt(policy.minimumSampleSize) && confidence >= policy.minimumConfidenceScore;
}
