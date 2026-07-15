import { z } from "zod";
import type { CampaignCandidateStatus, OpportunityStatus } from "@/generated/prisma/client";

/** Allowed forward status transitions for a Campaign Candidate. Approval and
 *  conversion are explicit, server-driven operations — UI reordering never
 *  bypasses these guards. */
const CANDIDATE_TRANSITIONS: Record<CampaignCandidateStatus, CampaignCandidateStatus[]> = {
  new: ["under_review", "rejected", "expired"],
  under_review: ["approved", "rejected", "expired"],
  approved: ["converted", "rejected", "expired"],
  rejected: [],
  expired: [],
  converted: [],
};

export function canTransitionCandidate(
  from: CampaignCandidateStatus,
  to: CampaignCandidateStatus,
): boolean {
  if (from === to) return false;
  return CANDIDATE_TRANSITIONS[from].includes(to);
}

/** A product opportunity may only become a candidate when it is approved and
 *  not past its expiration. Blocked products/offers are checked at the service
 *  layer (requires DB), this guard covers the opportunity-level facts. */
export function isOpportunityConvertible(
  status: OpportunityStatus,
  expiresAt: Date | null,
  now: Date = new Date(),
): { ok: true } | { ok: false; reason: string } {
  if (status !== "APPROVED") {
    return { ok: false, reason: "Opportunity ist nicht freigegeben." };
  }
  if (expiresAt && expiresAt.getTime() <= now.getTime()) {
    return { ok: false, reason: "Opportunity ist abgelaufen." };
  }
  return { ok: true };
}

/** Deterministic idempotency key so re-submitting the same opportunity cannot
 *  create a duplicate active candidate. */
export function candidateIdempotencyKey(opportunityId: string): string {
  return `candidate:${opportunityId}`;
}

export const createCampaignCandidateSchema = z.object({
  productOpportunityId: z.string().min(1),
  proposedObjective: z
    .enum(["traffic", "affiliate_clicks", "conversions", "revenue", "content_testing"])
    .optional(),
  languageCode: z.string().min(2).max(8).optional(),
  targetPlatformCandidates: z.array(z.string()).optional(),
  targetCountryCodes: z.array(z.string()).optional(),
  currency: z.string().max(3).optional(),
  evidenceReferences: z.array(z.string()).optional(),
});

export type CreateCampaignCandidateInput = z.infer<typeof createCampaignCandidateSchema>;

export const requestApprovalSchema = z.object({
  note: z.string().max(2000).optional(),
});

export const decideCandidateSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().max(2000).optional(),
});

export const convertCandidateSchema = z.object({
  name: z.string().min(1).max(200),
  idempotencyKey: z.string().min(1).optional(),
});
