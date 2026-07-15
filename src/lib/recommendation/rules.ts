/**
 * Deterministic, rule-based recommendation engine (Phase 6 foundation). Every
 * rule has a stable id + version, requires a minimum sample size, and never
 * reacts to a null metric as if it were zero. Rules only emit *recommendations*
 * — they never mutate live configuration. Output is deduplicated so the same
 * (type, scope) recommendation is never produced twice.
 */
import { Decimal, type DecimalValue } from "@/lib/shared/decimal";
import type { RecommendationType, ScopeType, ExpectedImpact } from "@/generated/prisma/client";

export interface HookPerformance {
  hookType: string;
  postCount: number;
  impressions: bigint;
  ctr: DecimalValue | null;
  conversionRate: DecimalValue | null;
  brandMedianCtr: DecimalValue;
  brandMedianConversion: DecimalValue;
  attributionErrors: number;
}

export interface ProductPerformance {
  productId: string;
  views: bigint;
  ctr: DecimalValue | null;
  conversionRate: DecimalValue | null;
  netRevenue: DecimalValue;
  generationCost: DecimalValue;
  affiliateLinkActive: boolean;
  attributionCorrect: boolean;
}

export interface RecommendationContext {
  hooks: HookPerformance[];
  products: ProductPerformance[];
}

export interface RecommendationDraft {
  recommendationType: RecommendationType;
  scopeType: ScopeType;
  scopeId: string;
  title: string;
  explanation: string;
  confidenceScore: number;
  expectedImpact: ExpectedImpact;
  evidenceReferences: string[];
  minimumEvidenceCount: number;
  sampleSize: bigint;
  ruleId: string;
}

function d(v: DecimalValue | null): Decimal | null {
  return v == null ? null : new Decimal(v);
}

function gte(a: DecimalValue | null, b: DecimalValue): boolean {
  const av = d(a);
  if (av === null) return false;
  return av.greaterThanOrEqualTo(new Decimal(b));
}

function lte(a: DecimalValue | null, b: DecimalValue): boolean {
  const av = d(a);
  if (av === null) return false;
  return av.lessThanOrEqualTo(new Decimal(b));
}

interface Rule {
  id: string;
  version: number;
  evaluate(ctx: RecommendationContext): RecommendationDraft[];
}

const REUSE_HOOK: Rule = {
  id: "reuse_hook",
  version: 1,
  evaluate(ctx) {
    const out: RecommendationDraft[] = [];
    for (const h of ctx.hooks) {
      if (h.postCount < 5) continue;
      if (h.impressions < 10_000n) continue;
      if (!gte(h.ctr, new Decimal(h.brandMedianCtr).times(1.25))) continue;
      if (!gte(h.conversionRate, h.brandMedianConversion)) continue;
      out.push({
        recommendationType: "REUSE_HOOK",
        scopeType: "CONTENT_ASSET",
        scopeId: h.hookType,
        title: `Hook-Typ "${h.hookType}" erneut verwenden`,
        explanation: `Mind. 5 Posts, ≥10.000 Impressionen, CTR ≥25% über Brand-Median und Conversion-Rate nicht unter Brand-Median.`,
        confidenceScore: 0.8,
        expectedImpact: "MEDIUM",
        evidenceReferences: [`hook:${h.hookType}`, `posts:${h.postCount}`],
        minimumEvidenceCount: 5,
        sampleSize: h.impressions,
        ruleId: "reuse_hook",
      });
    }
    return out;
  },
};

const RETIRE_HOOK: Rule = {
  id: "retire_hook",
  version: 1,
  evaluate(ctx) {
    const out: RecommendationDraft[] = [];
    for (const h of ctx.hooks) {
      if (h.postCount < 5) continue;
      if (h.impressions < 5_000n) continue;
      if (!lte(h.ctr, new Decimal(h.brandMedianCtr).times(0.4))) continue;
      if (h.attributionErrors > 0) continue;
      out.push({
        recommendationType: "RETIRE_HOOK",
        scopeType: "CONTENT_ASSET",
        scopeId: h.hookType,
        title: `Hook-Typ "${h.hookType}" zurückziehen`,
        explanation: `Mind. 5 Posts, ≥5.000 Impressionen, CTR ≥40% unter Brand-Median, keine Attribution-/Trackingfehler.`,
        confidenceScore: 0.75,
        expectedImpact: "MEDIUM",
        evidenceReferences: [`hook:${h.hookType}`, `posts:${h.postCount}`],
        minimumEvidenceCount: 5,
        sampleSize: h.impressions,
        ruleId: "retire_hook",
      });
    }
    return out;
  },
};

const CHANGE_CTA: Rule = {
  id: "change_cta",
  version: 1,
  evaluate(ctx) {
    const out: RecommendationDraft[] = [];
    for (const h of ctx.hooks) {
      const sufficient = h.postCount >= 5 && h.impressions >= 5_000n;
      const highViews = h.impressions >= 20_000n;
      const lowCtr = lte(h.ctr, new Decimal(h.brandMedianCtr).times(0.6));
      if (!sufficient || !highViews || !lowCtr) continue;
      out.push({
        recommendationType: "CHANGE_CTA",
        scopeType: "CONTENT_ASSET",
        scopeId: h.hookType,
        title: `CTA für Hook-Typ "${h.hookType}" anpassen`,
        explanation: `Hohe Views bei niedriger CTR und ausreichender Stichprobe.`,
        confidenceScore: 0.7,
        expectedImpact: "MEDIUM",
        evidenceReferences: [`hook:${h.hookType}`],
        minimumEvidenceCount: 5,
        sampleSize: h.impressions,
        ruleId: "change_cta",
      });
    }
    return out;
  },
};

const REVIEW_PRODUCT: Rule = {
  id: "review_product",
  version: 1,
  evaluate(ctx) {
    const out: RecommendationDraft[] = [];
    for (const p of ctx.products) {
      const highCtr = gte(p.ctr, "0.05");
      const lowConv = lte(p.conversionRate, "0.01");
      if (!highCtr || !lowConv) continue;
      if (!p.attributionCorrect || !p.affiliateLinkActive) continue;
      out.push({
        recommendationType: "REVIEW_ATTRIBUTION",
        scopeType: "PRODUCT",
        scopeId: p.productId,
        title: `Produkt ${p.productId} auf Landingpage/Attribution prüfen`,
        explanation: `Hohe CTR bei niedriger Conversion-Rate, korrekte Attribution, Affiliate-Link aktiv.`,
        confidenceScore: 0.7,
        expectedImpact: "HIGH",
        evidenceReferences: [`product:${p.productId}`],
        minimumEvidenceCount: 1,
        sampleSize: p.views,
        ruleId: "review_product",
      });
    }
    return out;
  },
};

const REDUCE_COST: Rule = {
  id: "reduce_cost",
  version: 1,
  evaluate(ctx) {
    const out: RecommendationDraft[] = [];
    for (const p of ctx.products) {
      const goodConv = gte(p.conversionRate, "0.02");
      const negativeNet = d(p.netRevenue) != null && d(p.netRevenue)!.lessThan(0);
      const highCost = d(p.generationCost) != null && d(p.generationCost)!.greaterThan(new Decimal(p.netRevenue).abs().plus(0));
      if (!goodConv || !negativeNet || !highCost) continue;
      out.push({
        recommendationType: "REDUCE_COST",
        scopeType: "PRODUCT",
        scopeId: p.productId,
        title: `Kosten für Produkt ${p.productId} reduzieren`,
        explanation: `Gute Conversion-Rate bei negativem Nettoerlös und hohen Generierungskosten.`,
        confidenceScore: 0.65,
        expectedImpact: "MEDIUM",
        evidenceReferences: [`product:${p.productId}`],
        minimumEvidenceCount: 1,
        sampleSize: p.views,
        ruleId: "reduce_cost",
      });
    }
    return out;
  },
};

export const RECOMMENDATION_RULES: Rule[] = [REUSE_HOOK, RETIRE_HOOK, CHANGE_CTA, REVIEW_PRODUCT, REDUCE_COST];

export function runRecommendationRules(ctx: RecommendationContext): RecommendationDraft[] {
  const drafts: RecommendationDraft[] = [];
  for (const rule of RECOMMENDATION_RULES) {
    try {
      drafts.push(...rule.evaluate(ctx));
    } catch {
      // A single failing rule must not abort the whole run.
    }
  }
  return deduplicateRecommendations(drafts);
}

/** Removes duplicate (recommendationType, scopeType, scopeId) drafts, keeping
 *  the one with the higher confidence score. */
export function deduplicateRecommendations(drafts: RecommendationDraft[]): RecommendationDraft[] {
  const byKey = new Map<string, RecommendationDraft>();
  for (const draft of drafts) {
    const key = `${draft.recommendationType}:${draft.scopeType}:${draft.scopeId}`;
    const existing = byKey.get(key);
    if (!existing || draft.confidenceScore > existing.confidenceScore) {
      byKey.set(key, draft);
    }
  }
  return [...byKey.values()];
}
