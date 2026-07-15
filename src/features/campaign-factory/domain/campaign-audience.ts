import { z } from "zod";
import { canTransitionAudience } from "@/features/campaign-factory/domain/campaign-strategy";
import type { CampaignAudienceStatus } from "@/generated/prisma/client";

export const createAudienceSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().min(1).max(4000),
  brandId: z.string().min(1).optional(),
  nicheId: z.string().min(1).optional(),
  languageCodes: z.array(z.string()).max(20).optional(),
  countryCodes: z.array(z.string()).max(50).optional(),
  demographicNotes: z.array(z.string()).max(50).optional(),
  interestTags: z.array(z.string()).max(50).optional(),
  problemStatements: z.array(z.string()).max(50).optional(),
  desiredOutcomes: z.array(z.string()).max(50).optional(),
  objections: z.array(z.string()).max(50).optional(),
  trustSignals: z.array(z.string()).max(50).optional(),
  prohibitedTargetingAttributes: z.array(z.string()).max(50).optional(),
});

export type CreateAudienceInput = z.infer<typeof createAudienceSchema>;

export const updateAudienceSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  description: z.string().min(1).max(4000).optional(),
  brandId: z.string().min(1).optional(),
  nicheId: z.string().min(1).optional(),
  languageCodes: z.array(z.string()).max(20).optional(),
  countryCodes: z.array(z.string()).max(50).optional(),
  demographicNotes: z.array(z.string()).max(50).optional(),
  interestTags: z.array(z.string()).max(50).optional(),
  problemStatements: z.array(z.string()).max(50).optional(),
  desiredOutcomes: z.array(z.string()).max(50).optional(),
  objections: z.array(z.string()).max(50).optional(),
  trustSignals: z.array(z.string()).max(50).optional(),
  prohibitedTargetingAttributes: z.array(z.string()).max(50).optional(),
  status: z.enum(["draft", "approved", "rejected", "archived"]).optional(),
});

export type UpdateAudienceInput = z.infer<typeof updateAudienceSchema>;

export function assertAudienceTransition(from: CampaignAudienceStatus, to: CampaignAudienceStatus) {
  const t = canTransitionAudience(from, to);
  if (!t.ok) throw new Error(t.reason);
}
