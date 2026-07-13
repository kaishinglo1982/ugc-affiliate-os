import { z } from "zod";

export const socialPostStatusEnum = z.enum([
  "DRAFT",
  "READY",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHING",
  "PUBLISHED",
  "FAILED",
  "CANCELLED",
]);

export const postFormSchema = z.object({
  accountId: z.string().uuid("Account wird benötigt"),
  campaignId: z.string().uuid().optional().or(z.literal("")),
  mediaAssetId: z.string().uuid().optional().or(z.literal("")),
  caption: z.string().trim().min(1, "Caption wird benötigt").max(2200),
  hashtags: z.string().trim().max(500).optional().or(z.literal("")),
  affiliateLinkText: z.string().trim().max(300).optional().or(z.literal("")),
  disclosure: z.string().trim().max(200).optional().or(z.literal("")),
});
export type PostFormInput = z.infer<typeof postFormSchema>;

export const scheduleSchema = z.object({
  id: z.string().uuid(),
  scheduledAt: z.string().trim().min(1, "Datum wird benötigt"),
});

export const idSchema = z.object({ id: z.string().uuid() });
export const statusChangeSchema = z.object({ id: z.string().uuid(), status: socialPostStatusEnum });

/** Splits a free-text hashtag field ("#ad, empfehlung reichweite") into a normalized `#tag` array. */
export function parseHashtags(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : `#${t}`));
}
