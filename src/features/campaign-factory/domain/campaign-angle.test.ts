import { describe, it, expect } from "vitest";
import {
  canTransitionAngle,
  createAngleSchema,
  isAngleApproved,
  CREATIVE_ANGLE_TYPES,
} from "@/features/campaign-factory/domain/campaign-angle";

describe("canTransitionAngle", () => {
  it("draft -> approved", () => {
    expect(canTransitionAngle("draft", "approved").ok).toBe(true);
  });
  it("draft -> rejected", () => {
    expect(canTransitionAngle("draft", "rejected").ok).toBe(true);
  });
  it("rejects approved -> rejected", () => {
    expect(canTransitionAngle("approved", "rejected").ok).toBe(false);
  });
  it("archived -> approved not allowed", () => {
    expect(canTransitionAngle("archived", "approved").ok).toBe(false);
  });
});

describe("angle schema", () => {
  it("accepts a valid angle", () => {
    const r = createAngleSchema.safeParse({
      campaignStrategyId: "s1",
      name: "Pain Point",
      angleType: "problem_solution",
      description: "Wir lösen X",
      coreMessage: "Mit Produkt Y",
    });
    expect(r.success).toBe(true);
  });
  it("rejects missing coreMessage", () => {
    const r = createAngleSchema.safeParse({
      campaignStrategyId: "s1",
      name: "Pain Point",
      angleType: "problem_solution",
      description: "Wir lösen X",
    });
    expect(r.success).toBe(false);
  });
  it("exposes all angle types", () => {
    expect(CREATIVE_ANGLE_TYPES).toContain("myth_busting");
  });
});

describe("isAngleApproved", () => {
  it("true only for approved", () => {
    expect(isAngleApproved("approved")).toBe(true);
    expect(isAngleApproved("draft")).toBe(false);
  });
});
