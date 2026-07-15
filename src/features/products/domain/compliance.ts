/**
 * Framework-free product compliance evaluation.
 *
 * Deterministic rule engine that inspects category/niche/market allowances plus
 * keyword-based risk detection on the title + description. Produces a
 * `ComplianceResult` with status, risk level, flags, and human-readable reasons.
 *
 * IMPORTANT: This is an automated heuristic aid, NOT legal advice.
 */
import {
  type RiskLevel,
  type ComplianceStatus,
} from "@/features/products/domain/types";

export const COMPLIANCE_VERSION = "1.0.0";

export interface ComplianceInput {
  categoryRiskLevel: RiskLevel;
  categoryAllowed: boolean;
  nicheAllowed: boolean;
  targetMarketAllowed: boolean;
  affiliateProgramAllowsPromotion: boolean | null;
  title: string;
  description: string | null;
  brandName: string | null;
}

export interface ComplianceResult {
  categoryAllowed: boolean;
  nicheAllowed: boolean;
  targetMarketAllowed: boolean;
  affiliateProgramAllowsPromotion: boolean | null;
  ageRestrictionDetected: boolean;
  healthClaimRiskDetected: boolean;
  financialClaimRiskDetected: boolean;
  regulatedProductRiskDetected: boolean;
  trademarkRiskDetected: boolean;
  misleadingClaimRiskDetected: boolean;
  disclosureRequired: boolean;
  manualReviewRequired: boolean;
  riskLevel: RiskLevel;
  status: ComplianceStatus;
  reasons: string[];
  evidenceReferences: string[];
}

const AGE_RESTRICTION_KEYWORDS = [
  "alkohol", "alcohol", "nicotine", "tobacco", "e-cigarette", "e cigarette",
  "vape", "weapon", "knife", "ammunition", "firearm", "gun", "pistol",
  "prescription", "cannabis", "marijuana", "drug",
];

const HEALTH_CLAIM_KEYWORDS = [
  "heilt", "heals", "cures", "cure", "treatment", "treats", "therapie",
  "therapy", "gegen krebs", "cancer cure", "weight loss miracle",
  "guaranteed results", "miracle", "healing",
];

const FINANCIAL_CLAIM_KEYWORDS = [
  "guaranteed profit", "investment return", "get rich", "double your money",
  "passive income guaranteed", "risk free investment",
];

const REGULATED_KEYWORDS = [
  "prescription", "medical device", "supplement drug", "pharmacy only",
  "rx only", "regulated substance",
];

const TRADEMARK_KEYWORDS = [
  "generic viagra", "viagra", "lek",
];

const MISLEADING_KEYWORDS = [
  "100% free", "no risk", "limited time only", "act now", "guaranteed win",
];

const NOT_LEGAL_ADVICE = "Automated heuristic evaluation — this is NOT legal advice.";

const RISK_ORDER: RiskLevel[] = ["low", "medium", "high", "critical"];

function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_ORDER.indexOf(a) >= RISK_ORDER.indexOf(b) ? a : b;
}

function containsAny(haystack: string, keywords: string[]): boolean {
  return keywords.some((k) => haystack.includes(k));
}

export function evaluateCompliance(
  input: ComplianceInput,
  version: string = COMPLIANCE_VERSION,
): ComplianceResult {
  const text = `${input.title} ${input.description ?? ""} ${input.brandName ?? ""}`.toLowerCase();

  const ageRestrictionDetected = containsAny(text, AGE_RESTRICTION_KEYWORDS);
  const healthClaimRiskDetected = containsAny(text, HEALTH_CLAIM_KEYWORDS);
  const financialClaimRiskDetected = containsAny(text, FINANCIAL_CLAIM_KEYWORDS);
  const regulatedProductRiskDetected = containsAny(text, REGULATED_KEYWORDS);
  const trademarkRiskDetected = containsAny(text, TRADEMARK_KEYWORDS);
  const misleadingClaimRiskDetected = containsAny(text, MISLEADING_KEYWORDS);

  const reasons: string[] = [];
  const evidenceReferences: string[] = [];

  if (!input.categoryAllowed) {
    reasons.push("Category is not allowed for promotion.");
    evidenceReferences.push("category_allowed=false");
  }
  if (!input.nicheAllowed) {
    reasons.push("Niche is not allowed for promotion.");
    evidenceReferences.push("niche_allowed=false");
  }
  if (!input.targetMarketAllowed) {
    reasons.push("Target market is not allowed.");
    evidenceReferences.push("target_market_allowed=false");
  }
  if (ageRestrictionDetected) {
    reasons.push("Age-restricted / prohibited item detected.");
    evidenceReferences.push("age_restriction");
  }
  if (healthClaimRiskDetected) {
    reasons.push("Unsupported health / medical claim detected.");
    evidenceReferences.push("health_claim");
  }
  if (regulatedProductRiskDetected) {
    reasons.push("Regulated product detected.");
    evidenceReferences.push("regulated_product");
  }
  if (financialClaimRiskDetected) {
    reasons.push("Financial / earnings claim detected — requires manual review.");
    evidenceReferences.push("financial_claim");
  }
  if (trademarkRiskDetected) {
    reasons.push("Possible trademark / brand-name misuse detected.");
    evidenceReferences.push("trademark");
  }
  if (misleadingClaimRiskDetected) {
    reasons.push("Potentially misleading claim detected.");
    evidenceReferences.push("misleading_claim");
  }
  if (input.affiliateProgramAllowsPromotion === false) {
    reasons.push("Affiliate program does not permit promotion of this product.");
    evidenceReferences.push("affiliate_program_disallows_promotion");
  }

  const hardBlock =
    !input.categoryAllowed ||
    !input.nicheAllowed ||
    !input.targetMarketAllowed ||
    ageRestrictionDetected ||
    regulatedProductRiskDetected ||
    healthClaimRiskDetected;

  let status: ComplianceStatus;
  let riskLevel: RiskLevel;
  let manualReviewRequired: boolean;

  if (hardBlock) {
    status = "failed";
    manualReviewRequired = false;
    riskLevel = maxRisk(input.categoryRiskLevel, "critical");
  } else if (
    financialClaimRiskDetected ||
    trademarkRiskDetected ||
    misleadingClaimRiskDetected ||
    input.affiliateProgramAllowsPromotion === false ||
    input.affiliateProgramAllowsPromotion === null
  ) {
    status = "manual_review";
    manualReviewRequired = true;
    riskLevel = maxRisk(input.categoryRiskLevel, "high");
    if (input.affiliateProgramAllowsPromotion === null) {
      reasons.push("Affiliate program promotion allowance unknown — manual review required.");
      evidenceReferences.push("affiliate_program_allowance_unknown");
    }
  } else {
    status = "passed";
    manualReviewRequired = false;
    riskLevel = input.categoryRiskLevel;
  }

  const disclosureRequired =
    ageRestrictionDetected ||
    healthClaimRiskDetected ||
    financialClaimRiskDetected ||
    trademarkRiskDetected ||
    misleadingClaimRiskDetected ||
    regulatedProductRiskDetected ||
    manualReviewRequired ||
    status === "failed";

  reasons.push(NOT_LEGAL_ADVICE);

  return {
    categoryAllowed: input.categoryAllowed,
    nicheAllowed: input.nicheAllowed,
    targetMarketAllowed: input.targetMarketAllowed,
    affiliateProgramAllowsPromotion: input.affiliateProgramAllowsPromotion,
    ageRestrictionDetected,
    healthClaimRiskDetected,
    financialClaimRiskDetected,
    regulatedProductRiskDetected,
    trademarkRiskDetected,
    misleadingClaimRiskDetected,
    disclosureRequired,
    manualReviewRequired,
    riskLevel,
    status,
    reasons,
    evidenceReferences,
  };
}
