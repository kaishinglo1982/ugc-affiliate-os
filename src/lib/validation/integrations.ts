import { z } from "zod";

export const saveHuggingFaceSettingsSchema = z.object({
  apiKey: z
    .string()
    .trim()
    .max(200, "API-Key zu lang")
    .refine((v) => v === "" || v.startsWith("hf_"), "HuggingFace-Keys beginnen mit hf_"),
  model: z.string().trim().min(1, "Modell auswählen"),
  temperature: z.coerce.number().min(0).max(2),
  maxTokens: z.coerce.number().int().min(16).max(32768),
  autoSuggestHooks: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
});
export type SaveHuggingFaceSettingsInput = z.infer<typeof saveHuggingFaceSettingsSchema>;

export const disconnectIntegrationSchema = z.object({
  providerKey: z.string().trim().min(1),
});
