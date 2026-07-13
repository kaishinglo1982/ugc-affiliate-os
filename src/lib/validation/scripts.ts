import { z } from "zod";

export const scriptGenerateSchema = z.object({
  title: z.string().trim().min(2, "Titel wird benötigt").max(160),
  productId: z.string().uuid().optional().or(z.literal("")),
  campaignId: z.string().uuid().optional().or(z.literal("")),
  audience: z.string().trim().min(2, "Zielgruppe wird benötigt").max(300),
  platform: z.string().trim().min(1, "Plattform wählen"),
  durationSec: z.coerce.number().min(5).max(300),
  tone: z.string().trim().min(1),
  hookType: z.string().trim().min(1),
  cta: z.string().trim().min(2).max(200),
  provider: z.enum(["template", "openai", "anthropic", "google", "mistral", "openrouter", "custom"]),
});
export type ScriptGenerateInput = z.infer<typeof scriptGenerateSchema>;

export const idSchema = z.object({ id: z.string().uuid() });
export const scriptStatusEnum = z.enum(["DRAFT", "APPROVED", "ARCHIVED"]);
