import { describe, it, expect } from "vitest";
import {
  canTransitionExperiment,
  validateExperimentVariants,
  variantsChangedAfterStart,
} from "@/lib/experimentation/status";
import { resolveAssignment, assignVariant } from "@/lib/experimentation/assignment";
import { analyzeExperiment, twoProportionZTest } from "@/lib/experimentation/analysis";

describe("experiment status machine", () => {
  it("allows draft -> awaiting_approval -> scheduled -> running", () => {
    expect(canTransitionExperiment("DRAFT", "AWAITING_APPROVAL")).toBe(true);
    expect(canTransitionExperiment("AWAITING_APPROVAL", "SCHEDULED")).toBe(true);
    expect(canTransitionExperiment("SCHEDULED", "RUNNING")).toBe(true);
  });

  it("forbids transitions out of terminal states", () => {
    expect(canTransitionExperiment("COMPLETED", "RUNNING")).toBe(false);
    expect(canTransitionExperiment("CANCELLED", "DRAFT")).toBe(false);
  });
});

describe("experiment variant validation", () => {
  it("requires >= 2 variants, one control, weights summing to 100", () => {
    const ok = validateExperimentVariants([
      { id: "a", isControl: true, trafficWeight: 50, status: "ACTIVE" },
      { id: "b", isControl: false, trafficWeight: 50, status: "ACTIVE" },
    ]);
    expect(ok.valid).toBe(true);
  });

  it("rejects a single control and bad weights", () => {
    const bad = validateExperimentVariants([
      { id: "a", isControl: true, trafficWeight: 30, status: "ACTIVE" },
      { id: "b", isControl: true, trafficWeight: 30, status: "ACTIVE" },
    ]);
    expect(bad.valid).toBe(false);
    expect(bad.errors.length).toBeGreaterThan(0);
  });
});

describe("deterministic assignment", () => {
  const variants = [
    { id: "control", trafficWeight: 50, isControl: true },
    { id: "variantB", trafficWeight: 50, isControl: false },
  ];

  it("is deterministic for the same key", () => {
    const a = resolveAssignment({
      experimentId: "exp1",
      assignmentType: "PUBLISHING_JOB",
      assignmentReferenceId: "job-42",
      variants,
    });
    const b = resolveAssignment({
      experimentId: "exp1",
      assignmentType: "PUBLISHING_JOB",
      assignmentReferenceId: "job-42",
      variants,
    });
    expect(a.variantId).toBe(b.variantId);
    expect(a.assignmentKey).toBe(b.assignmentKey);
  });

  it("distributes roughly proportionally across many keys", () => {
    const counts: Record<string, number> = { control: 0, variantB: 0 };
    for (let i = 0; i < 1000; i++) {
      const variantId = assignVariant("exp1", `key-${i}`, variants);
      counts[variantId] += 1;
    }
    // ~50/50 split, allowing tolerance.
    expect(Math.abs(counts.control - counts.variantB)).toBeLessThan(120);
  });

  it("different experiments map the same reference to possibly different variants", () => {
    const key = "shared-ref";
    const e1 = assignVariant("exp1", key, variants);
    const e2 = assignVariant("exp2", key, variants);
    // Not required to differ, but must be deterministic & valid.
    expect(["control", "variantB"]).toContain(e1);
    expect(["control", "variantB"]).toContain(e2);
  });
});

describe("experiment analysis", () => {
  it("reports insufficient data below the minimum sample size", () => {
    const out = analyzeExperiment({
      experimentId: "e",
      primaryMetric: "CONVERSION_RATE",
      minimumSampleSize: 1000,
      confidenceThreshold: "0.95",
      practicalSignificanceThreshold: "0.1",
      variants: [
        { variantId: "c", isControl: true, value: "0.05", sampleSize: 100n, denominator: 2000n },
        { variantId: "v", isControl: false, value: "0.20", sampleSize: 100n, denominator: 2000n },
      ],
    });
    expect(out.status).toBe("INSUFFICIENT_DATA");
  });

  it("detects a winner with practical + statistical significance", () => {
    const out = analyzeExperiment({
      experimentId: "e",
      primaryMetric: "CONVERSION_RATE",
      minimumSampleSize: 100,
      confidenceThreshold: "0.95",
      practicalSignificanceThreshold: "0.1",
      variants: [
        { variantId: "c", isControl: true, value: "0.05", sampleSize: 5000n, denominator: 100_000n },
        { variantId: "v", isControl: false, value: "0.20", sampleSize: 5000n, denominator: 100_000n },
      ],
    });
    expect(out.status).toBe("WINNER_FOUND");
    expect(out.winningVariantId).toBe("v");
    expect(out.relativeLift?.toFixed(2)).toBe("3.00");
  });

  it("is inconclusive without practical significance", () => {
    const out = analyzeExperiment({
      experimentId: "e",
      primaryMetric: "CONVERSION_RATE",
      minimumSampleSize: 100,
      confidenceThreshold: "0.95",
      practicalSignificanceThreshold: "0.5",
      variants: [
        { variantId: "c", isControl: true, value: "0.05", sampleSize: 5000n, denominator: 100_000n },
        { variantId: "v", isControl: false, value: "0.052", sampleSize: 5000n, denominator: 100_000n },
      ],
    });
    expect(out.status).toBe("INCONCLUSIVE");
  });
});

describe("twoProportionZTest", () => {
  it("returns ~1 for identical proportions", () => {
    expect(twoProportionZTest(50, 100, 50, 100)).toBeCloseTo(1, 1);
  });
  it("returns a small p-value for very different proportions", () => {
    expect(twoProportionZTest(5, 100, 50, 100)).toBeLessThan(0.001);
  });
});
