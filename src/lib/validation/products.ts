import { z } from "zod";

const dimensionValue = z.coerce.number().min(0).max(10);

export const productScoreDimensionsSchema = z.object({
  demand: dimensionValue,
  commission: dimensionValue,
  contentPotential: dimensionValue,
  competition: dimensionValue,
  problemSolvingPower: dimensionValue,
  visualDemonstrability: dimensionValue,
  platformFit: dimensionValue,
  trendMomentum: dimensionValue,
  returnRisk: dimensionValue,
  complianceRisk: dimensionValue,
});

export const productStatusEnum = z.enum([
  "DISCOVERED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "PAUSED",
  "UNAVAILABLE",
  "ARCHIVED",
]);

export const trendStatusEnum = z.enum(["EMERGING", "GROWING", "STABLE", "DECLINING", "SATURATED"]);
export const riskLevelEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const productFormSchema = z.object({
  name: z.string().trim().min(2, "Name wird benötigt").max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  vendor: z.string().trim().max(120).optional().or(z.literal("")),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  tags: z.string().trim().max(300).optional().or(z.literal("")),
  targetUrl: z.string().trim().url("Ungültige URL").optional().or(z.literal("")),
  imageUrl: z.string().trim().url("Ungültige URL").optional().or(z.literal("")),
  price: z.coerce.number().min(0).max(1_000_000).optional(),
  commissionRate: z.coerce.number().min(0).max(100).optional(),
  audience: z.string().trim().max(500).optional().or(z.literal("")),
  problemSolved: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  status: productStatusEnum,
  trend: trendStatusEnum,
  risk: riskLevelEnum,
  isFavorite: z.coerce.boolean().optional(),
  dimensions: productScoreDimensionsSchema,
});

export type ProductFormInput = z.infer<typeof productFormSchema>;

export const productIdSchema = z.object({ id: z.string().uuid() });
