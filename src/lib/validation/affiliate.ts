import { z } from "zod";

export const affiliateProviderEnum = z.enum([
  "AMAZON_ASSOCIATES",
  "EBAY_PARTNER_NETWORK",
  "AWIN",
  "CJ_AFFILIATE",
  "IMPACT",
  "RAKUTEN_ADVERTISING",
  "SHAREASALE",
  "DIGISTORE24",
  "ADCELL",
  "CUSTOM",
]);

export const affiliateProgramSchema = z.object({
  provider: affiliateProviderEnum,
  customName: z.string().trim().max(120).optional().or(z.literal("")),
  trackingId: z.string().trim().max(120).optional().or(z.literal("")),
  apiKey: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type AffiliateProgramInput = z.infer<typeof affiliateProgramSchema>;

export const affiliateLinkSchema = z.object({
  programId: z.string().uuid("Bitte ein Programm wählen"),
  productId: z.string().uuid().optional().or(z.literal("")),
  label: z.string().trim().min(2, "Bezeichnung wird benötigt").max(160),
  destinationUrl: z.string().trim().url("Ungültige URL"),
  deepLink: z.string().trim().max(1000).optional().or(z.literal("")),
  platform: z.string().trim().max(60).optional().or(z.literal("")),
  utmSource: z.string().trim().max(60).optional().or(z.literal("")),
  utmMedium: z.string().trim().max(60).optional().or(z.literal("")),
  utmCampaign: z.string().trim().max(60).optional().or(z.literal("")),
  utmContent: z.string().trim().max(60).optional().or(z.literal("")),
  utmTerm: z.string().trim().max(60).optional().or(z.literal("")),
});
export type AffiliateLinkInput = z.infer<typeof affiliateLinkSchema>;

export const idSchema = z.object({ id: z.string().uuid() });
