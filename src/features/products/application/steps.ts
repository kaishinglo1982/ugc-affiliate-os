/**
 * Phase 7 — research job step registry (dependency-free).
 *
 * No DB / network imports here so it can be consumed by pure tests. Each step
 * name maps to a `ResearchJobType` and (where relevant) a core application
 * function executed by `runAll`.
 */
import type { ResearchJobType } from "@/features/products/domain/types";

/** Ordered list of research-job steps. Order is significant. */
export const STEP_NAMES = [
  "refreshOffers",
  "discovery",
  "recomputeMatches",
  "compliance",
  "contentFit",
  "profitability",
  "opportunityScoring",
  "expireOpportunities",
  "dataQuality",
] as const;

export type StepName = (typeof STEP_NAMES)[number];

export const STEP_JOB_TYPE: Record<StepName, ResearchJobType> = {
  refreshOffers: "product_offer_refresh",
  discovery: "product_discovery_run",
  recomputeMatches: "product_deduplication",
  compliance: "product_compliance_evaluation",
  contentFit: "product_content_fit_analysis",
  profitability: "product_profitability_estimation",
  opportunityScoring: "product_opportunity_scoring",
  expireOpportunities: "product_opportunity_expiration",
  dataQuality: "product_data_quality_scan",
};
