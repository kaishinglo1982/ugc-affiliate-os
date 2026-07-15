/**
 * Conservative experiment analysis. Never overstates significance: if the
 * minimum sample size is not reached the result is INSUFFICIENT_DATA; a lift is
 * only a "winner" when BOTH practical significance (relative/absolute threshold)
 * AND statistical confidence (threshold) are met. Floating point is avoided via
 * Decimal; the two-proportion z-test is the only place statistical confidence
 * is derived, and it is clearly labeled. No winner is ever auto-applied — the
 * engine only produces a recommendation-grade result.
 */
import { Decimal, type DecimalValue } from "@/lib/shared/decimal";
import type { ExperimentMetric, ExperimentResultStatus, AnalysisMethod } from "@/generated/prisma/client";

export interface VariantStat {
  variantId: string;
  isControl: boolean;
  /** Primary metric value for this variant (already aggregated). */
  value: DecimalValue | null;
  /** Number of observations (posts/sessions) that produced this value. */
  sampleSize: bigint;
  /** Trials for rate metrics (impressions, link clicks, video starts). */
  denominator?: bigint | null;
}

export interface AnalysisInput {
  experimentId: string;
  primaryMetric: ExperimentMetric;
  minimumSampleSize: number;
  confidenceThreshold: DecimalValue;
  practicalSignificanceThreshold: DecimalValue;
  variants: VariantStat[];
  analysisVersion?: string;
}

export interface AnalysisOutcome {
  status: ExperimentResultStatus;
  winningVariantId: string | null;
  primaryMetric: ExperimentMetric;
  controlValue: Decimal | null;
  winningValue: Decimal | null;
  relativeLift: Decimal | null;
  absoluteLift: Decimal | null;
  sampleSize: bigint;
  confidenceScore: number | null;
  practicalSignificanceReached: boolean;
  analysisMethod: AnalysisMethod;
  analysisVersion: string;
  explanation: string;
}

export const ANALYSIS_VERSION = "1.0.0";

const METRIC_DIRECTION: Record<ExperimentMetric, "higher" | "lower"> = {
  VIEW_RATE: "higher",
  COMPLETION_RATE: "higher",
  ENGAGEMENT_RATE: "higher",
  CLICK_THROUGH_RATE: "higher",
  CONVERSION_RATE: "higher",
  COMMISSION_REVENUE: "higher",
  ESTIMATED_NET_REVENUE: "higher",
  REVENUE_PER_VIEW: "higher",
  REVENUE_PER_CLICK: "higher",
  RETURN_ON_CONTENT_SPEND: "higher",
};

/** Two-proportion z-test returning the two-sided p-value. */
export function twoProportionZTest(
  successesA: number,
  trialsA: number,
  successesB: number,
  trialsB: number,
): number {
  if (trialsA <= 0 || trialsB <= 0) return 1;
  const pA = successesA / trialsA;
  const pB = successesB / trialsB;
  const pooled = (successesA + successesB) / (trialsA + trialsB);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / trialsA + 1 / trialsB));
  if (se === 0) return 1;
  const z = Math.abs(pB - pA) / se;
  // Normal CDF approximation (Abramowitz-Stegun 7.1.26).
  return 2 * (1 - normalCdf(z));
}

function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-(z * z) / 2);
  let prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) prob = 1 - prob;
  return prob;
}

function better(a: Decimal, b: Decimal, direction: "higher" | "lower"): Decimal {
  if (direction === "higher") return a.greaterThan(b) ? a : b;
  return a.lessThan(b) ? a : b;
}

export function analyzeExperiment(input: AnalysisInput): AnalysisOutcome {
  const control = input.variants.find((v) => v.isControl);
  const candidates = input.variants.filter((v) => !v.isControl);
  const analysisVersion = input.analysisVersion ?? ANALYSIS_VERSION;
  const direction = METRIC_DIRECTION[input.primaryMetric];

  const base = {
    primaryMetric: input.primaryMetric,
    analysisVersion,
    winningVariantId: null,
    relativeLift: null,
    absoluteLift: null,
    confidenceScore: null,
    practicalSignificanceReached: false,
  };

  if (!control || candidates.length === 0) {
    return {
      ...base,
      status: "INCONCLUSIVE",
      controlValue: control?.value != null ? new Decimal(control.value) : null,
      winningValue: null,
      sampleSize: control?.sampleSize ?? 0n,
      analysisMethod: "DESCRIPTIVE",
      explanation: "Kein vollständiges Variantenpaar (Kontrolle + Kandidat) vorhanden.",
    };
  }

  const controlValue = control.value != null ? new Decimal(control.value) : null;
  const controlSample = control.sampleSize;

  // Choose the strongest candidate relative to the control.
  let bestCandidate = candidates[0];
  let bestValue = bestCandidate.value != null ? new Decimal(bestCandidate.value) : null;
  for (const c of candidates.slice(1)) {
    if (c.value == null) continue;
    const cv = new Decimal(c.value);
    if (bestValue == null || better(cv, bestValue, direction).eq(cv)) {
      bestCandidate = c;
      bestValue = cv;
    }
  }

  const sampleSize = controlSample < bestCandidate.sampleSize ? controlSample : bestCandidate.sampleSize;
  const minimumReached = sampleSize >= BigInt(input.minimumSampleSize);

  if (!minimumReached) {
    return {
      ...base,
      status: "INSUFFICIENT_DATA",
      controlValue,
      winningValue: bestValue,
      sampleSize,
      analysisMethod: "DESCRIPTIVE",
      explanation: `Mindeststichprobe nicht erreicht (${sampleSize.toString()} < ${input.minimumSampleSize}).`,
    };
  }

  const absoluteLift = bestValue != null && controlValue != null ? bestValue.minus(controlValue) : null;
  const relativeLift =
    bestValue != null && controlValue != null && !controlValue.isZero()
      ? bestValue.minus(controlValue).div(controlValue)
      : null;

  const practicalThreshold = new Decimal(input.practicalSignificanceThreshold);
  const relativeReached = relativeLift != null && relativeLift.abs().greaterThanOrEqualTo(practicalThreshold);
  const absoluteReached = absoluteLift != null && absoluteLift.abs().greaterThanOrEqualTo(practicalThreshold);
  const practicalSignificanceReached = relativeReached || absoluteReached;

  // Confidence via two-proportion z-test when denominators are available.
  let confidence: number | null = null;
  let method: AnalysisMethod = "DESCRIPTIVE";
  if (
    control.denominator &&
    bestCandidate.denominator &&
    controlValue != null &&
    bestValue != null
  ) {
    method = "FREQUENTIST";
    const denomC = Number(control.denominator);
    const denomW = Number(bestCandidate.denominator);
    const succC = Math.round(controlValue.toNumber() * denomC);
    const succW = Math.round(bestValue.toNumber() * denomW);
    const p = twoProportionZTest(succC, denomC, succW, denomW);
    confidence = 1 - p;
  }

  const confidenceThreshold = new Decimal(input.confidenceThreshold);
  const confidenceReached = confidence != null && new Decimal(confidence).greaterThanOrEqualTo(confidenceThreshold);

  let status: ExperimentResultStatus;
  let explanation: string;
  let winningVariantId: string | null = null;

  if (practicalSignificanceReached && confidenceReached) {
    status = "WINNER_FOUND";
    winningVariantId = bestCandidate.variantId;
    explanation = `Variante ${bestCandidate.variantId} übertrifft die Kontrolle praktisch und statistisch (Konfidenz ${(confidence ?? 0).toFixed(3)}).`;
  } else if (practicalSignificanceReached && !confidenceReached) {
    status = "COMPLETED_WITHOUT_WINNER";
    explanation = "Praktische Schwelle erreicht, aber statistische Konfidenz nicht ausreichend.";
  } else {
    status = "INCONCLUSIVE";
    explanation = "Weder praktische noch statistische Signifikanz erreicht.";
  }

  return {
    ...base,
    status,
    winningVariantId,
    controlValue,
    winningValue: bestValue,
    relativeLift,
    absoluteLift,
    sampleSize,
    confidenceScore: confidence,
    practicalSignificanceReached,
    analysisMethod: method,
    explanation,
  };
}
