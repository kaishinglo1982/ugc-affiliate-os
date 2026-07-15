/**
 * Experiment lifecycle (status machine) and structural validation. Pure,
 * framework-free, and unit-tested. Business rules enforced here: every
 * experiment needs >= 2 variants with exactly one control; traffic weights must
 * sum to 100; variants cannot change after the experiment starts; start requires
 * prior approval.
 */
import type { ExperimentStatus, ExperimentVariantStatus } from "@/generated/prisma/client";

export interface ExperimentVariantSeed {
  id: string;
  isControl: boolean;
  trafficWeight: number;
  status: ExperimentVariantStatus;
}

const TERMINAL: ExperimentStatus[] = ["COMPLETED", "CANCELLED", "INCONCLUSIVE"];

export function canTransitionExperiment(from: ExperimentStatus, to: ExperimentStatus): boolean {
  if (from === to) return false;
  if (TERMINAL.includes(from)) return false;
  const allowed: Record<ExperimentStatus, ExperimentStatus[]> = {
    DRAFT: ["AWAITING_APPROVAL", "CANCELLED"],
    AWAITING_APPROVAL: ["SCHEDULED", "DRAFT", "CANCELLED"],
    SCHEDULED: ["RUNNING", "CANCELLED"],
    RUNNING: ["PAUSED", "COMPLETED", "INCONCLUSIVE", "CANCELLED"],
    PAUSED: ["RUNNING", "COMPLETED", "INCONCLUSIVE", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
    INCONCLUSIVE: [],
  };
  return allowed[from]?.includes(to) ?? false;
}

export interface VariantValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateExperimentVariants(variants: ExperimentVariantSeed[]): VariantValidationResult {
  const errors: string[] = [];
  if (variants.length < 2) {
    errors.push("Ein Experiment benötigt mindestens zwei Varianten.");
  }
  const controls = variants.filter((v) => v.isControl);
  if (controls.length !== 1) {
    errors.push("Genau eine Variante muss die Kontrollvariante sein.");
  }
  const weightSum = variants.reduce((sum, v) => sum + v.trafficWeight, 0);
  if (weightSum !== 100) {
    errors.push(`Die Traffic-Gewichte müssen in Summe 100 ergeben (aktuell: ${weightSum}).`);
  }
  if (variants.some((v) => v.trafficWeight < 0)) {
    errors.push("Traffic-Gewichte dürfen nicht negativ sein.");
  }
  return { valid: errors.length === 0, errors };
}

/** Returns true if any variant would be materially changed after start. */
export function variantsChangedAfterStart(
  before: ExperimentVariantSeed[],
  after: ExperimentVariantSeed[],
): boolean {
  if (before.length !== after.length) return true;
  const byId = new Map(before.map((v) => [v.id, v]));
  for (const v of after) {
    const prev = byId.get(v.id);
    if (!prev) return true;
    if (
      prev.isControl !== v.isControl ||
      prev.trafficWeight !== v.trafficWeight ||
      prev.status !== v.status
    ) {
      return true;
    }
  }
  return false;
}
