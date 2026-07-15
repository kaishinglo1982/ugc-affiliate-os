import { describe, it, expect } from "vitest";
import {
  isOpportunityConvertible,
  canTransitionCandidate,
  candidateIdempotencyKey,
  createCampaignCandidateSchema,
} from "@/features/campaign-factory/domain/campaign-candidate";

describe("Campaign Candidate domain", () => {
  describe("isOpportunityConvertible", () => {
    it("allows an approved, unexpired opportunity", () => {
      const result = isOpportunityConvertible("APPROVED", new Date(Date.now() + 86400000));
      expect(result).toEqual({ ok: true });
    });

    it("blocks a non-approved opportunity", () => {
      const result = isOpportunityConvertible("NEW", null);
      expect(result.ok).toBe(false);
    });

    it("blocks an expired opportunity", () => {
      const result = isOpportunityConvertible("APPROVED", new Date(Date.now() - 1000));
      expect(result.ok).toBe(false);
    });
  });

  describe("canTransitionCandidate", () => {
    it("allows new -> under_review", () => {
      expect(canTransitionCandidate("new", "under_review")).toBe(true);
    });
    it("forbids new -> approved (must pass review)", () => {
      expect(canTransitionCandidate("new", "approved")).toBe(false);
    });
    it("allows approved -> converted", () => {
      expect(canTransitionCandidate("approved", "converted")).toBe(true);
    });
    it("forbids any transition from converted", () => {
      expect(canTransitionCandidate("converted", "approved")).toBe(false);
    });
    it("forbids identical status", () => {
      expect(canTransitionCandidate("new", "new")).toBe(false);
    });
  });

  describe("idempotency key", () => {
    it("is deterministic per opportunity", () => {
      expect(candidateIdempotencyKey("opp-1")).toBe("candidate:opp-1");
      expect(candidateIdempotencyKey("opp-1")).toBe(candidateIdempotencyKey("opp-1"));
    });
  });

  describe("createCampaignCandidateSchema", () => {
    it("accepts a minimal valid input", () => {
      const parsed = createCampaignCandidateSchema.safeParse({ productOpportunityId: "opp-1" });
      expect(parsed.success).toBe(true);
    });
    it("rejects missing opportunity id", () => {
      const parsed = createCampaignCandidateSchema.safeParse({});
      expect(parsed.success).toBe(false);
    });
  });
});
