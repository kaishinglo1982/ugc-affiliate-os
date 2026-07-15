/**
 * Framework-free product opportunity scoring.
 *
 * Each component score (0..100) is weighted by `OPPORTUNITY_WEIGHTS` and summed
 * to a single integer total (0..100). Deterministic and side-effect free.
 * If `complianceCritical` is set the opportunity is blocked (total 0).
 */
import {
  OPPORTUNITY_WEIGHTS,
  type OpportunityComponent,
  SCORING_VERSION,
} from "@/features/products/domain/types";

export interface OpportunityInput {
  commissionScore: number;
  demandScore: number;
  competitionScore: number;
  contentFitScore: number;
  audienceFitScore: number;
  trendScore: number;
  profitabilityScore: number;
  dataQualityScore: number;
  complianceScore: number;
  confidenceScore: number;
  sampleSize: bigint | null;
  complianceCritical: boolean;
  evidence: Record<string, string[]>;
}

export interface ScoredComponent {
  component: OpportunityComponent;
  score: number;
  weight: number;
  contribution: number;
  explanation: string | null;
  evidenceReferences: string[];
}

export interface OpportunityScoreResult {
  totalScore: number;
  components: ScoredComponent[];
  explanation: string;
  confidenceScore: number;
}

const WEIGHT_SUM_TOLERANCE = 1e-9;

/** Internal assertion that the configured weights sum to exactly 1. */
export function assertWeightsSumToOne(): void {
  const sum = Object.values(OPPORTUNITY_WEIGHTS).reduce((acc, w) => acc + w, 0);
  if (Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE) {
    throw new Error(`OPPORTUNITY_WEIGHTS must sum to 1, got ${sum}`);
  }
}

function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

const COMPONENT_LABELS: Record<OpportunityComponent, string> = {
  commissionScore: "Commission",
  demandScore: "Demand",
  competitionScore: "Competition (inverse)",
  contentFitScore: "Content fit",
  audienceFitScore: "Audience fit",
  trendScore: "Trend",
  profitabilityScore: "Profitability",
  dataQualityScore: "Data quality",
  complianceScore: "Compliance",
};

export function scoreOpportunity(input: OpportunityInput): OpportunityScoreResult {
  assertWeightsSumToOne();

  const components: ScoredComponent[] = (
    Object.keys(OPPORTUNITY_WEIGHTS) as OpportunityComponent[]
  ).map((component) => {
    const raw = input[component] ?? 0;
    const score = clampScore(raw);
    const weight = OPPORTUNITY_WEIGHTS[component];
    const contribution = (score * weight * 100) / 100; // keep precision, score already 0..100
    const evidenceReferences = input.evidence[component] ?? [];
    const explanation = `${COMPONENT_LABELS[component]} score ${score.toFixed(0)} × weight ${weight}`;
    return { component, score, weight, contribution, explanation, evidenceReferences };
  });

  let total = components.reduce((acc, c) => acc + c.score * c.weight, 0);
  total = clampScore(total);

  const explanationParts: string[] = [];

  if (input.complianceCritical) {
    total = 0;
    explanationParts.push("Critical compliance risk blocks opportunity");
  }

  const top = [...components]
    .filter((c) => c.score > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3);
  if (top.length > 0) {
    const topText = top
      .map((c) => `${COMPONENT_LABELS[c.component]} (${c.contribution.toFixed(1)})`)
      .join(", ");
    explanationParts.push(`Top contributors: ${topText}`);
  }

  // Lower confidence when data is weak (low data-quality or small sample).
  let confidence = clampConfidence(input.confidenceScore);
  const dataQualityPenalty = input.dataQualityScore < 50 ? 0.7 : 1;
  const samplePenalty = input.sampleSize === null || input.sampleSize < 30n ? 0.8 : 1;
  confidence = Math.max(0, Math.min(1, confidence * dataQualityPenalty * samplePenalty));

  if (dataQualityPenalty < 1) {
    explanationParts.push("Low data-quality score reduced confidence");
  }
  if (samplePenalty < 1) {
    explanationParts.push(
      input.sampleSize === null
        ? "No sample size available — confidence reduced"
        : "Small sample size — confidence reduced",
    );
  }

  explanationParts.push("Scores are heuristic estimates; no revenue is promised");

  return {
    totalScore: Math.round(total),
    components,
    explanation: explanationParts.join(". ") + ".",
    confidenceScore: Math.round(confidence * 1000) / 1000,
  };
}

function clampConfidence(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
