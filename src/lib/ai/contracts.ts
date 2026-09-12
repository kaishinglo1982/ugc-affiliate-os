import { z } from "zod";

export const AiCapabilitySchema = z.enum([
  "text.generate",
  "text.structure",
  "content.ugc-script",
  "content.caption",
  "product.score",
]);

export const AiRequestSchema = z.object({
  workspaceId: z.string().min(1),
  capability: AiCapabilitySchema,
  prompt: z.string().min(1).max(50_000),
  system: z.string().max(20_000).optional(),
  model: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).default(0),
  maxOutputTokens: z.number().int().positive().max(32_000).default(2_000),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const AiUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  estimatedCostCents: z.number().nonnegative(),
});

export const AiResponseSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  content: z.string(),
  finishReason: z.enum(["stop", "length", "blocked", "error"]),
  usage: AiUsageSchema,
  traceId: z.string().min(1),
  offline: z.boolean(),
});

export type AiCapability = z.infer<typeof AiCapabilitySchema>;
export type AiRequest = z.infer<typeof AiRequestSchema>;
export type AiResponse = z.infer<typeof AiResponseSchema>;

export interface AiProvider {
  readonly id: string;
  readonly offline: boolean;
  supports(capability: AiCapability): boolean;
  isAvailable(workspaceId: string): Promise<boolean>;
  generate(request: AiRequest): Promise<AiResponse>;
}
