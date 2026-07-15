/**
 * Deterministic experiment assignment. A stable FNV-1a hash of
 * (experimentId + assignmentKey) maps each assignment to a variant by weighted
 * bucket, so retries and recomputation always yield the same variant — no
 * random re-assignment, fully idempotent. The DB unique constraint on
 * (experimentId, assignmentKey) is the second guard against duplicates.
 */
import type { ExperimentAssignmentType } from "@/generated/prisma/client";

export interface AssignmentVariant {
  id: string;
  trafficWeight: number;
  isControl: boolean;
}

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Deterministic variant id for a given assignment key. `weights` must be aligned
 * with `variants` and sum to 100; if they do not, the function still buckets
 * proportionally to the provided weights.
 */
export function assignVariant(
  experimentId: string,
  assignmentKey: string,
  variants: AssignmentVariant[],
): string {
  if (variants.length === 0) throw new Error("Keine Varianten für Zuordnung vorhanden.");
  const total = variants.reduce((sum, v) => sum + Math.max(0, v.trafficWeight), 0);
  if (total === 0) throw new Error("Traffic-Gewichte ergeben in Summe 0.");
  const bucket = fnv1a(`${experimentId}:${assignmentKey}`) % total;
  let cumulative = 0;
  for (const variant of variants) {
    cumulative += Math.max(0, variant.trafficWeight);
    if (bucket < cumulative) return variant.id;
  }
  return variants[variants.length - 1].id;
}

export interface AssignmentInput {
  experimentId: string;
  assignmentType: ExperimentAssignmentType;
  assignmentReferenceId: string;
  variants: AssignmentVariant[];
}

/** Builds the deterministic, idempotent assignment key for a reference. */
export function buildAssignmentKey(
  experimentId: string,
  type: ExperimentAssignmentType,
  referenceId: string,
): string {
  return `${experimentId}:${type}:${referenceId}`;
}

export function resolveAssignment(input: AssignmentInput): {
  assignmentKey: string;
  variantId: string;
} {
  const assignmentKey = buildAssignmentKey(
    input.experimentId,
    input.assignmentType,
    input.assignmentReferenceId,
  );
  return { assignmentKey, variantId: assignVariant(input.experimentId, assignmentKey, input.variants) };
}
