/**
 * Deterministic product scoring with chance/risk weighting.
 *
 * Positive signals are weighted-averaged into a positive contribution, risk
 * signals into a negative contribution; `score = positive − negative`,
 * clamped to 0..100. Missing signals are renormalized out (they never skew
 * the number, only the confidence). A compliance risk of >= 80 forces
 * `reject`. No LLM dependency — the math is fully deterministic and side
 * effect free, so the same input always produces the same result.
 */
import {
  productScoreInputSchema,
  PRODUCT_SCORING_VERSION,
  type ProductDecision,
  type ProductScoreInput,
  type ProductScoreResult,
} from "./types";

export const POSITIVE_WEIGHTS = {
  demand: 0.2,
  trendGrowth: 0.15,
  commission: 0.2,
  audienceFit: 0.1,
  contentFit: 0.1,
  conversionProbability: 0.15,
  repurchasePotential: 0.1,
} as const;

export const NEGATIVE_WEIGHTS = {
  competitionRisk: 0.25,
  returnRisk: 0.2,
  productionCostRisk: 0.15,
  advertisingCostRisk: 0.15,
  complianceRisk: 0.25,
} as const;

export type PositiveSignal = keyof typeof POSITIVE_WEIGHTS;
export type NegativeSignal = keyof typeof NEGATIVE_WEIGHTS;

/** Risk values at or above this threshold force an automatic rejection. */
export const COMPLIANCE_REJECT_THRESHOLD = 80;

export const DECISION_THRESHOLDS = {
  scale: 75,
  test: 55,
  watch: 35,
} as const;

const TOTAL_SIGNALS =
  Object.keys(POSITIVE_WEIGHTS).length + Object.keys(NEGATIVE_WEIGHTS).length;

const POSITIVE_LABELS: Record<PositiveSignal, string> = {
  demand: "Demand",
  trendGrowth: "Trend growth",
  commission: "Commission",
  audienceFit: "Audience fit",
  contentFit: "Content fit",
  conversionProbability: "Conversion probability",
  repurchasePotential: "Repurchase potential",
};

const NEGATIVE_LABELS: Record<NegativeSignal, string> = {
  competitionRisk: "Competition risk",
  returnRisk: "Return risk",
  productionCostRisk: "Production cost risk",
  advertisingCostRisk: "Advertising cost risk",
  complianceRisk: "Compliance risk",
};

function assertWeightsSumToOne(): void {
  const positive = Object.values(POSITIVE_WEIGHTS).reduce((a, b) => a + b, 0);
  const negative = Object.values(NEGATIVE_WEIGHTS).reduce((a, b) => a + b, 0);
  const tolerance = 1e-9;
  if (Math.abs(positive - 1) > tolerance || Math.abs(negative - 1) > tolerance) {
    throw new Error("commerce-core: weights must sum to 1 per side");
  }
}

function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Weighted average over the provided signals only. Missing signals are
 * renormalized out so partial data does not skew the number (confidence
 * reflects the gap instead).
 */
function weightedAverage(
  input: ProductScoreInput,
  weights: Record<string, number>,
): { contribution: number; provided: number; total: number } {
  let numerator = 0;
  let weightSum = 0;
  let provided = 0;
  for (const key of Object.keys(weights)) {
    const value = input[key as keyof ProductScoreInput];
    if (typeof value === "number") {
      const weight = weights[key];
      numerator += clampScore(value) * weight;
      weightSum += weight;
      provided += 1;
    }
  }
  if (weightSum === 0) return { contribution: 50, provided, total: 0 };
  return { contribution: numerator / weightSum, provided, total: Object.keys(weights).length };
}

/**
 * Deterministic product score. Validates the input shape via Zod (0..100,
 * integers) and returns the same result for the same input.
 */
export function scoreProduct(
  input: ProductScoreInput,
  version: string = PRODUCT_SCORING_VERSION,
): ProductScoreResult {
  assertWeightsSumToOne();

  const parsed = productScoreInputSchema.parse(input);

  const positive = weightedAverage(parsed, POSITIVE_WEIGHTS);
  const negative = weightedAverage(parsed, NEGATIVE_WEIGHTS);

  const positiveContribution = round3(positive.contribution);
  const negativeContribution = round3(negative.contribution);
  const providedCount = positive.provided + negative.provided;
  const score =
    providedCount === 0 ? 50 : Math.round(clampScore(positiveContribution - negativeContribution));
  const confidence = round3(0.3 + 0.7 * (providedCount / TOTAL_SIGNALS));

  const complianceValue = parsed.complianceRisk ?? 0;
  const complianceForcesReject = complianceValue >= COMPLIANCE_REJECT_THRESHOLD;

  let decision: ProductDecision;
  if (complianceForcesReject) {
    decision = "reject";
  } else if (score >= DECISION_THRESHOLDS.scale) {
    decision = "scale";
  } else if (score >= DECISION_THRESHOLDS.test) {
    decision = "test";
  } else if (score >= DECISION_THRESHOLDS.watch) {
    decision = "watch";
  } else {
    decision = "reject";
  }

  const reasons = buildReasons({
    parsed,
    positiveContribution,
    negativeContribution,
    score,
    confidence,
    decision,
    complianceForcesReject,
    providedCount,
    version,
  });

  return {
    score,
    confidence,
    decision,
    positiveContribution,
    negativeContribution,
    reasons,
  };
}

interface ReasonContext {
  parsed: ProductScoreInput;
  positiveContribution: number;
  negativeContribution: number;
  score: number;
  confidence: number;
  decision: ProductDecision;
  complianceForcesReject: boolean;
  providedCount: number;
  version: string;
}

function buildReasons(ctx: ReasonContext): string[] {
  const reasons: string[] = [];

  if (ctx.providedCount === 0) {
    reasons.push("No signal data provided — score is neutral 50 with minimum confidence.");
  }

  if (ctx.complianceForcesReject) {
    reasons.push(
      `Automatic rejection: compliance risk ${ctx.parsed.complianceRisk} (threshold ${COMPLIANCE_REJECT_THRESHOLD}).`,
    );
  }

  for (const key of Object.keys(POSITIVE_WEIGHTS) as PositiveSignal[]) {
    const value = ctx.parsed[key];
    if (typeof value !== "number") continue;
    if (value >= 75) {
      reasons.push(`${POSITIVE_LABELS[key]} is strong (${value}).`);
    } else if (value <= 25) {
      reasons.push(`${POSITIVE_LABELS[key]} is weak (${value}).`);
    }
  }

  for (const key of Object.keys(NEGATIVE_WEIGHTS) as NegativeSignal[]) {
    const value = ctx.parsed[key];
    if (typeof value !== "number") continue;
    if (value >= 75) {
      reasons.push(`${NEGATIVE_LABELS[key]} is high (${value}).`);
    } else if (value <= 25) {
      reasons.push(`${NEGATIVE_LABELS[key]} is low (${value}).`);
    }
  }

  if (ctx.confidence < 0.7) {
    reasons.push("Confidence is reduced because the data basis is incomplete.");
  }

  reasons.push(
    `Decision "${ctx.decision}" from score ${ctx.score} (positive ${ctx.positiveContribution.toFixed(1)}, negative ${ctx.negativeContribution.toFixed(1)}).`,
  );
  reasons.push(`Scoring version ${ctx.version} — heuristic estimate, no revenue is promised.`);

  return reasons;
}
