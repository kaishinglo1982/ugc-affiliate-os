import { z } from "zod";

export const providerCapabilitySchema = z.enum([
  "LLM_TEXT",
  "IMAGE",
  "VIDEO",
  "VOICE",
  "AVATAR",
  "SEARCH",
  "AUTOMATION",
]);

export const providerRoutingStrategySchema = z.enum([
  "FREE_FIRST",
  "COST_FIRST",
  "QUALITY_FIRST",
  "MANUAL",
]);

export const providerRoutingPolicySchema = z.object({
  name: z.string().trim().min(1).max(120),
  capability: providerCapabilitySchema,
  strategy: providerRoutingStrategySchema.default("FREE_FIRST"),
  enabled: z.boolean().default(true),
  allowedProviderKeys: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
  deniedProviderKeys: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
  fallbackProviderKeys: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
  premiumRequiresApproval: z.boolean().default(true),
  maxCostPerCall: z.number().nonnegative().max(100000).optional(),
  dailyBudget: z.number().nonnegative().max(10000000).optional(),
  regionAllowList: z.array(z.string().trim().min(2).max(32)).max(50).default([]),
});

export const providerRoutingQuerySchema = z.object({
  capability: providerCapabilitySchema.optional(),
  enabled: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
});
