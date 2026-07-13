import { z } from "zod";

export const revenueStatusEnum = z.enum(["PENDING", "CONFIRMED", "PAID", "REVERSED"]);

export const expenseCategoryEnum = z.enum([
  "TOOLS_SOFTWARE",
  "ADVERTISING",
  "AI_CREDITS",
  "VIDEO_PRODUCTION",
  "STOCK_MEDIA",
  "SUBSCRIPTIONS",
  "FREELANCE",
  "HARDWARE",
  "OFFICE",
  "TAXES_FEES",
  "OTHER",
]);

export const revenueFormSchema = z.object({
  date: z.string().trim().min(1, "Datum wird benötigt"),
  programId: z.string().uuid().optional().or(z.literal("")),
  productId: z.string().uuid().optional().or(z.literal("")),
  campaignId: z.string().uuid().optional().or(z.literal("")),
  platform: z.string().trim().max(60).optional().or(z.literal("")),
  grossAmount: z.coerce.number().min(0, "Betrag darf nicht negativ sein").max(10_000_000),
  status: revenueStatusEnum,
  reference: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type RevenueFormInput = z.infer<typeof revenueFormSchema>;

export const expenseFormSchema = z.object({
  date: z.string().trim().min(1, "Datum wird benötigt"),
  category: expenseCategoryEnum,
  vendor: z.string().trim().max(160).optional().or(z.literal("")),
  campaignId: z.string().uuid().optional().or(z.literal("")),
  productId: z.string().uuid().optional().or(z.literal("")),
  amount: z.coerce.number().min(0, "Betrag darf nicht negativ sein").max(10_000_000),
  isRecurring: z.coerce.boolean().optional(),
  isTaxRelevant: z.coerce.boolean().optional(),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type ExpenseFormInput = z.infer<typeof expenseFormSchema>;

export const taxSettingFormSchema = z.object({
  reserveRatePercent: z.coerce.number().min(0).max(100),
  vatRatePercent: z.coerce.number().min(0).max(100),
  vatEnabled: z.coerce.boolean().optional(),
  tradeTaxReservePercent: z.coerce.number().min(0).max(100),
  incomeTaxReservePercent: z.coerce.number().min(0).max(100),
});
export type TaxSettingFormInput = z.infer<typeof taxSettingFormSchema>;

export const idSchema = z.object({ id: z.string().uuid() });
