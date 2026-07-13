import { z } from "zod";

export const videoProviderEnum = z.enum([
  "HIGGSFIELD",
  "RUNWAY",
  "KLING",
  "VEO",
  "HEYGEN",
  "ELEVENLABS",
  "CUSTOM",
  "MOCK",
]);

export const videoJobFormSchema = z.object({
  scriptId: z.string().uuid().optional().or(z.literal("")),
  productId: z.string().uuid().optional().or(z.literal("")),
  campaignId: z.string().uuid().optional().or(z.literal("")),
  provider: videoProviderEnum,
  format: z.string().trim().min(1, "Format wird benötigt"),
  aspectRatio: z.string().trim().min(1),
  durationSec: z.coerce.number().min(3).max(600),
  style: z.string().trim().max(120).optional().or(z.literal("")),
  avatar: z.string().trim().max(120).optional().or(z.literal("")),
  voice: z.string().trim().max(120).optional().or(z.literal("")),
  language: z.string().trim().min(1),
  subtitles: z.coerce.boolean().optional(),
  music: z.string().trim().max(120).optional().or(z.literal("")),
  simulateOutcome: z.enum(["success", "review", "failure"]).optional(),
});
export type VideoJobFormInput = z.infer<typeof videoJobFormSchema>;

export const idSchema = z.object({ id: z.string().uuid() });
