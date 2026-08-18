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


export const providerCandidateSchema = z.object({
  providerKey: z.string().trim().min(1).max(100),
  modelKey: z.string().trim().min(1).max(200).optional(),
  capability: providerCapabilitySchema,
  estimatedCost: z.number().nonnegative().max(100000),
  qualityScore: z.number().min(0).max(1),
  region: z.string().trim().min(2).max(32).optional(),
  premium: z.boolean().default(false),
});

export const providerRouteRequestSchema = z.object({
  capability: providerCapabilitySchema,
  candidates: z.array(providerCandidateSchema).min(1).max(100),
});

export const providerUsageSchema = z.object({
  providerKey: z.string().trim().min(1).max(100),
  capability: providerCapabilitySchema,
  modelKey: z.string().trim().min(1).max(200).optional(),
  requestId: z.string().trim().min(1).max(200).optional(),
  inputUnits: z.number().int().nonnegative().default(0),
  outputUnits: z.number().int().nonnegative().default(0),
  estimatedCost: z.number().nonnegative().max(100000),
  currency: z.string().trim().length(3).default("EUR"),
  success: z.boolean(),
  latencyMs: z.number().int().nonnegative().optional(),
  errorCode: z.string().trim().min(1).max(100).optional(),
});
