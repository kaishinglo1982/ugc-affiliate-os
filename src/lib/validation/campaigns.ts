import { z } from "zod";

export const campaignStatusEnum = z.enum([
  "DRAFT",
  "RESEARCH",
  "SCRIPTING",
  "PRODUCTION",
  "REVIEW",
  "SCHEDULED",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "ARCHIVED",
]);

export const CAMPAIGN_STATUS_ORDER = campaignStatusEnum.options;

export const campaignFormSchema = z.object({
  name: z.string().trim().min(2, "Name wird benötigt").max(160),
  productId: z.string().uuid().optional().or(z.literal("")),
  affiliateLinkId: z.string().uuid().optional().or(z.literal("")),
  audience: z.string().trim().max(500).optional().or(z.literal("")),
  targetPlatforms: z.array(z.string()).optional().default([]),
  contentGoal: z.string().trim().max(500).optional().or(z.literal("")),
  budget: z.coerce.number().min(0).max(10_000_000).optional(),
  startDate: z.string().trim().optional().or(z.literal("")),
  endDate: z.string().trim().optional().or(z.literal("")),
  status: campaignStatusEnum,
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type CampaignFormInput = z.infer<typeof campaignFormSchema>;

export const idSchema = z.object({ id: z.string().uuid() });
export const statusChangeSchema = z.object({ id: z.string().uuid(), status: campaignStatusEnum });
