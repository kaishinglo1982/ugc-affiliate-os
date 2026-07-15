/**
 * Framework-free product deduplication / match detection.
 *
 * Pure, deterministic functions that decide whether an incoming offer matches an
 * already-known product. Priority order follows spec §13:
 *   external_id > gtin > manufacturer_part_number > normalized_name > fuzzy > manual
 * (manual is NOT auto-detected here). No `any`; all inputs typed.
 */
import type { MatchMethod, NormalizedOffer } from "@/features/products/domain/types";

export type MatchEvidence = string;

export interface MatchResult {
  method: MatchMethod;
  confidence: number;
  evidence: MatchEvidence[];
}

/** Exact, case-insensitive trimmed comparison of external ids. */
export function matchesExternalId(existingExternalId: string | null, candidateExternalId: string): boolean {
  if (!existingExternalId) return false;
  return existingExternalId.trim().toLowerCase() === candidateExternalId.trim().toLowerCase();
}

/** Lowercase, trim, remove non-alphanumeric characters for stable comparison. */
export function normalizeIdentifier(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Levenshtein edit distance (iterative, O(n*m)). */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_v, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function wordJaccard(a: string, b: string): number {
  const wa = new Set(normalizeName(a).split(" ").filter(Boolean));
  const wb = new Set(normalizeName(b).split(" ").filter(Boolean));
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  const union = wa.size + wb.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function matchByGtin(existing: string | null, candidate: string | null): MatchResult | null {
  if (!existing || !candidate) return null;
  if (normalizeIdentifier(existing) === normalizeIdentifier(candidate)) {
    return { method: "gtin", confidence: 0.98, evidence: [`GTIN match: ${existing}`] };
  }
  return null;
}

export function matchByManufacturerPartNumber(existing: string | null, candidate: string | null): MatchResult | null {
  if (!existing || !candidate) return null;
  if (normalizeIdentifier(existing) === normalizeIdentifier(candidate)) {
    return {
      method: "manufacturer_part_number",
      confidence: 0.95,
      evidence: [`Manufacturer part number match: ${existing}`],
    };
  }
  return null;
}

export function matchByNormalizedName(existingName: string, candidateName: string): MatchResult | null {
  if (!existingName || !candidateName) return null;
  const a = normalizeName(existingName);
  const b = normalizeName(candidateName);
  if (a === b) {
    return { method: "normalized_name", confidence: 0.97, evidence: [`Exact normalized name: "${a}"`] };
  }
  const sim = wordJaccard(existingName, candidateName);
  if (sim >= 0.6) {
    return {
      method: "normalized_name",
      confidence: Math.round(sim * 100) / 100,
      evidence: [`Normalized name similarity ${sim.toFixed(2)}`],
    };
  }
  return null;
}

/** Looser match — returned as candidate for review only, never auto-merge.
 *  Uses character-level similarity so it can catch typos that the word-set
 *  `matchByNormalizedName` misses. Confidence is kept in [0.6, 0.9). */
export function fuzzyMatch(existingName: string, candidateName: string): MatchResult | null {
  if (!existingName || !candidateName) return null;
  const a = normalizeName(existingName);
  const b = normalizeName(candidateName);
  if (a === b) return null; // exact belongs to normalized_name, not fuzzy
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length) || 1;
  const sim = 1 - dist / maxLen;
  if (sim >= 0.6 && sim < 0.9) {
    return {
      method: "fuzzy",
      confidence: Math.round(sim * 100) / 100,
      evidence: [`Fuzzy similarity ${sim.toFixed(2)} (manual review recommended)`],
    };
  }
  return null;
}

export interface MatchResolutionTarget {
  externalProductId?: string | null;
  gtin?: string | null;
  manufacturerPartNumber?: string | null;
  normalizedName: string;
}

/**
 * Tries match methods in priority order and returns the first non-null result.
 * Manual matching is intentionally NOT performed here.
 */
export function resolveMatch(
  existing: MatchResolutionTarget,
  candidate: NormalizedOffer,
): MatchResult | null {
  if (existing.externalProductId && matchesExternalId(existing.externalProductId, candidate.externalProductId)) {
    return {
      method: "external_id",
      confidence: 0.99,
      evidence: [`External id match: ${candidate.externalProductId}`],
    };
  }
  const gtin = matchByGtin(existing.gtin ?? null, candidate.gtin);
  if (gtin) return gtin;
  const mpn = matchByManufacturerPartNumber(existing.manufacturerPartNumber ?? null, candidate.manufacturerPartNumber);
  if (mpn) return mpn;
  const name = matchByNormalizedName(existing.normalizedName, candidate.title);
  if (name) return name;
  const fuzzy = fuzzyMatch(existing.normalizedName, candidate.title);
  if (fuzzy) return fuzzy;
  return null;
}
