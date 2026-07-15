import { describe, it, expect } from "vitest";
import { computeDataQualityScores, detectDataQualityIssues } from "@/lib/data-quality/engine";
import { detectAnomalies } from "@/lib/anomaly/rules";
import { runRecommendationRules, deduplicateRecommendations } from "@/lib/recommendation/rules";
import { nextVersion, canEditVariant, deriveVariant, sanitizePromptReference } from "@/lib/content-intelligence/variant";
import {
  defaultOptimizationPolicy,
  isRecommendationBlocked,
  requiresApprovalForRecommendation,
} from "@/lib/optimization/policy";
import { classifyConfidence, canSupersede } from "@/lib/content-intelligence/profile";

describe("data quality", () => {
  const input = {
    totalExpectedMetrics: 10,
    presentMetrics: 10,
    staleMetricCount: 0,
    duplicateEventCount: 0,
    currencyMismatchCount: 0,
    missingAttributionCount: 0,
    invalidTimestampCount: 0,
    orphanedPostCount: 0,
    orphanedTransactionCount: 0,
    providerMappingErrorCount: 0,
    unexpectedNegativeCount: 0,
    hoursSinceLastSync: 2,
    freshnessThresholdHours: 24,
  };

  it("scores a clean dataset near 1.0", () => {
    const scores = computeDataQualityScores(input);
    expect(scores.overall).toBeGreaterThan(0.95);
    expect(scores.overall).toBeLessThanOrEqual(1);
  });

  it("penalizes missing metrics and stale data", () => {
    const scores = computeDataQualityScores({ ...input, presentMetrics: 5, staleMetricCount: 4 });
    expect(scores.completeness).toBe(0.5);
    expect(scores.overall).toBeLessThan(0.99);
  });

  it("detects issues with severity", () => {
    const issues = detectDataQualityIssues({ ...input, duplicateEventCount: 12, currencyMismatchCount: 4 });
    const dup = issues.find((i) => i.issueType === "DUPLICATE_EVENTS");
    expect(dup?.severity).toBe("HIGH");
  });
});

describe("anomaly detection", () => {
  const scope = { scopeType: "SOCIAL_ACCOUNT" as const, scopeId: "acc-1" };
  const ctx = {
    sampleSize: 500,
    minimumSampleSize: 100,
    viewsObserved: 100,
    viewsExpectedMin: 1000,
    viewsExpectedMax: 5000,
    linkClicksObserved: 50,
    linkClicksExpectedMax: 20,
    conversionsObserved: 5,
    conversionsExpectedMin: 10,
    refundsObserved: 2,
    refundsExpectedMax: 5,
    costObserved: 100,
    costExpectedMax: 200,
    hasAnalyticsData: true,
    importDelayHours: null,
    affiliateLinkErrorCount: 0,
  };

  it("flags a view drop with sufficient sample", () => {
    const anomalies = detectAnomalies(ctx, scope);
    expect(anomalies.some((a) => a.anomalyType === "VIEW_DROP")).toBe(true);
  });

  it("does not flag without minimum sample", () => {
    const anomalies = detectAnomalies({ ...ctx, sampleSize: 10 }, scope);
    expect(anomalies.every((a) => a.anomalyType !== "VIEW_DROP")).toBe(true);
  });

  it("flags missing analytics data regardless of sample", () => {
    const anomalies = detectAnomalies({ ...ctx, hasAnalyticsData: false }, scope);
    expect(anomalies.some((a) => a.anomalyType === "MISSING_ANALYTICS_DATA")).toBe(true);
  });
});

describe("recommendation rules", () => {
  const ctx = {
    hooks: [
      {
        hookType: "CURIOSITY",
        postCount: 6,
        impressions: 15000n,
        ctr: "0.20",
        conversionRate: "0.05",
        brandMedianCtr: "0.10",
        brandMedianConversion: "0.04",
        attributionErrors: 0,
      },
      {
        hookType: "SHOCK",
        postCount: 6,
        impressions: 8000n,
        ctr: "0.03",
        conversionRate: "0.01",
        brandMedianCtr: "0.10",
        brandMedianConversion: "0.04",
        attributionErrors: 0,
      },
    ],
    products: [
      {
        productId: "p-1",
        views: 5000n,
        ctr: "0.08",
        conversionRate: "0.005",
        netRevenue: "-5.00",
        generationCost: "20.00",
        affiliateLinkActive: true,
        attributionCorrect: true,
      },
    ],
  };

  it("produces reuse and retire recommendations", () => {
    const recs = runRecommendationRules(ctx);
    const types = recs.map((r) => r.recommendationType);
    expect(types).toContain("REUSE_HOOK");
    expect(types).toContain("RETIRE_HOOK");
  });

  it("deduplicates by type+scope", () => {
    const a = { recommendationType: "REUSE_HOOK" as const, scopeType: "CONTENT_ASSET" as const, scopeId: "X", title: "t", explanation: "e", confidenceScore: 0.5, expectedImpact: "LOW" as const, evidenceReferences: [], minimumEvidenceCount: 1, sampleSize: 0n, ruleId: "r" };
    const b = { ...a, confidenceScore: 0.9 };
    const deduped = deduplicateRecommendations([a, b]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].confidenceScore).toBe(0.9);
  });
});

describe("content variant versioning", () => {
  it("computes next version", () => {
    expect(nextVersion([1, 2, 3])).toBe(4);
    expect(nextVersion([])).toBe(1);
  });

  it("published variants are immutable", () => {
    expect(canEditVariant("PUBLISHED")).toBe(false);
    expect(canEditVariant("DRAFT")).toBe(true);
  });

  it("derives a new version preserving source", () => {
    const v = deriveVariant({ id: "base", version: 2, name: "A" }, { parentContentAssetId: "ca", name: "A v3", generatedBy: "AI" });
    expect(v.version).toBe(3);
    expect(v.sourceVariantId).toBe("base");
  });

  it("rejects secrets in prompt reference", () => {
    expect(() => sanitizePromptReference("api_key=abc")).toThrow();
    expect(sanitizePromptReference("ref-123")).toBe("ref-123");
  });
});

describe("optimization policy", () => {
  it("defaults to observe-only with approvals required", () => {
    const p = defaultOptimizationPolicy("ws", "WORKSPACE", "ws");
    expect(p.mode).toBe("OBSERVE_ONLY");
    expect(p.requireApprovalForExperiment).toBe(true);
    expect(isRecommendationBlocked(p, "REUSE_HOOK")).toBe(false);
    expect(requiresApprovalForRecommendation(p, "REUSE_HOOK")).toBe(true);
  });
});

describe("content intelligence confidence", () => {
  it("classifies scores", () => {
    expect(classifyConfidence(0.9)).toBe("high");
    expect(classifyConfidence(0.6)).toBe("medium");
    expect(classifyConfidence(0.2)).toBe("low");
    expect(classifyConfidence(null)).toBe("unknown");
  });

  it("manual overrides automatic", () => {
    expect(canSupersede("MANUAL", "AI")).toBe(false);
    expect(canSupersede("RULE_ENGINE", "AI")).toBe(true);
  });
});
