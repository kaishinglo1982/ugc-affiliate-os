import { describe, it, expect } from "vitest";
import {
  canTransitionStrategy,
  canTransitionAudience,
  createStrategySchema,
  isStrategyApproved,
} from "@/features/campaign-factory/domain/campaign-strategy";
import {
  createAudienceSchema,
  assertAudienceTransition,
} from "@/features/campaign-factory/domain/campaign-audience";

describe("canTransitionStrategy", () => {
  it("moves draft -> under_review", () => {
    expect(canTransitionStrategy("draft", "under_review").ok).toBe(true);
  });
  it("moves under_review -> approved", () => {
    expect(canTransitionStrategy("under_review", "approved").ok).toBe(true);
  });
  it("rejects approved -> draft", () => {
    expect(canTransitionStrategy("approved", "draft").ok).toBe(false);
  });
  it("rejects superseded -> draft", () => {
    expect(canTransitionStrategy("superseded", "draft").ok).toBe(false);
  });
  it("allows same-state", () => {
    expect(canTransitionStrategy("draft", "draft").ok).toBe(true);
  });
});

describe("canTransitionAudience", () => {
  it("moves draft -> approved", () => {
    expect(canTransitionAudience("draft", "approved").ok).toBe(true);
  });
  it("rejects approved -> rejected", () => {
    expect(canTransitionAudience("approved", "rejected").ok).toBe(false);
  });
  it("assertAudienceTransition throws on invalid", () => {
    expect(() => assertAudienceTransition("approved", "rejected")).toThrow();
  });
});

describe("schema validation", () => {
  it("accepts a valid strategy", () => {
    const r = createStrategySchema.safeParse({
      campaignCandidateId: "c1",
      name: "Q3 Push",
      objective: "traffic",
      primarySuccessMetric: "clicks",
    });
    expect(r.success).toBe(true);
  });
  it("rejects missing objective", () => {
    const r = createStrategySchema.safeParse({
      campaignCandidateId: "c1",
      name: "Q3 Push",
      primarySuccessMetric: "clicks",
    });
    expect(r.success).toBe(false);
  });
  it("rejects empty name", () => {
    const r = createStrategySchema.safeParse({
      campaignCandidateId: "c1",
      name: "",
      objective: "traffic",
      primarySuccessMetric: "clicks",
    });
    expect(r.success).toBe(false);
  });
  it("accepts a valid audience", () => {
    const r = createAudienceSchema.safeParse({
      name: "Fitness Moms",
      description: "Active mothers",
      interestTags: ["yoga"],
    });
    expect(r.success).toBe(true);
  });
  it("rejects audience without description", () => {
    const r = createAudienceSchema.safeParse({ name: "Fitness Moms" });
    expect(r.success).toBe(false);
  });
});

describe("isStrategyApproved", () => {
  it("true only for approved", () => {
    expect(isStrategyApproved("approved")).toBe(true);
    expect(isStrategyApproved("draft")).toBe(false);
  });
});
