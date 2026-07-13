/**
 * Product Radar scoring engine. Each dimension is scored 0-10 by the owner
 * (or defaulted) and combined with a fixed, transparent weighting into a
 * single 0-100 total score. The weights and per-dimension contribution are
 * always returned alongside the total so the UI can show exactly how the
 * score was derived — never a black box number.
 */

export interface ScoreDimensions {
  demand: number;
  commission: number;
  contentPotential: number;
  competition: number; // higher input = more competition = scored inverted
  problemSolvingPower: number;
  visualDemonstrability: number;
  platformFit: number;
  trendMomentum: number;
  returnRisk: number; // higher input = higher risk = scored inverted
  complianceRisk: number; // higher input = higher risk = scored inverted
}

export const SCORE_WEIGHTS: Record<keyof ScoreDimensions, number> = {
  demand: 0.16,
  commission: 0.12,
  contentPotential: 0.14,
  competition: 0.08,
  problemSolvingPower: 0.12,
  visualDemonstrability: 0.1,
  platformFit: 0.08,
  trendMomentum: 0.1,
  returnRisk: 0.05,
  complianceRisk: 0.05,
};

export const INVERTED_DIMENSIONS: ReadonlySet<keyof ScoreDimensions> = new Set([
  "competition",
  "returnRisk",
  "complianceRisk",
]);

export interface ScoreBreakdownEntry {
  dimension: keyof ScoreDimensions;
  rawValue: number;
  effectiveValue: number;
  weight: number;
  contribution: number;
}

export interface ScoreResult {
  totalScore: number;
  breakdown: ScoreBreakdownEntry[];
}

function clamp0to10(value: number): number {
  return Math.max(0, Math.min(10, value));
}

export function computeProductScore(dimensions: ScoreDimensions): ScoreResult {
  const breakdown: ScoreBreakdownEntry[] = (
    Object.keys(SCORE_WEIGHTS) as Array<keyof ScoreDimensions>
  ).map((dimension) => {
    const rawValue = clamp0to10(dimensions[dimension]);
    const effectiveValue = INVERTED_DIMENSIONS.has(dimension) ? 10 - rawValue : rawValue;
    const weight = SCORE_WEIGHTS[dimension];
    const contribution = effectiveValue * weight * 10; // scale 0-10 dimension to 0-100 total
    return { dimension, rawValue, effectiveValue, weight, contribution };
  });

  const totalScore = Math.round(breakdown.reduce((sum, entry) => sum + entry.contribution, 0));

  return { totalScore: Math.max(0, Math.min(100, totalScore)), breakdown };
}

export const DIMENSION_LABELS: Record<keyof ScoreDimensions, string> = {
  demand: "Nachfrage",
  commission: "Provision",
  contentPotential: "Content-Potenzial",
  competition: "Wettbewerb",
  problemSolvingPower: "Problemlösungsstärke",
  visualDemonstrability: "Visuelle Demonstrierbarkeit",
  platformFit: "Plattform-Fit",
  trendMomentum: "Trenddynamik",
  returnRisk: "Retourenrisiko",
  complianceRisk: "Compliance-Risiko",
};
