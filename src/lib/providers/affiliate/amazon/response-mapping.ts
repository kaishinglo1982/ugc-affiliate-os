/**
 * Maps PA-API 5.0 item shapes onto the domain's `NormalizedOffer`.
 *
 * Deliberately honest about what PA-API does and doesn't give us:
 * - No commission rate/amount: Amazon publishes category-based "Standard
 *   Program Fee Rates" separately from the API, not as a response field.
 *   Faking a plausible-looking number here would be exactly the kind of
 *   silent placeholder this codebase's own audits have flagged elsewhere —
 *   so `commissionType` stays `"unknown"` and both amount fields stay `null`
 *   unless a caller supplies its own fee table (`categoryCommissionRates`,
 *   keyed by PA-API `BrowseNodeInfo` display name) — optional, off by default.
 * - No customer rating/review count: not present in the `ItemInfo`/`Offers`
 *   resources this adapter requests. Left `null` rather than guessed.
 */
import { Decimal } from "@/lib/shared/decimal";
import type { AffiliateNetwork, Availability, NormalizedOffer } from "@/features/products/domain/types";
import { normalizeOffer } from "@/features/products/domain/normalization";
import type { PaApiItem } from "./types";

function mapAvailability(type: string | undefined): Availability {
  switch (type) {
    case "Now":
      return "in_stock";
    case "OutOfStock":
      return "out_of_stock";
    case "PreOrder":
      return "preorder";
    case "BackOrder":
    case "LimitedAvailability":
      return "limited";
    default:
      return "unknown";
  }
}

export interface AmazonOfferMappingOptions {
  /** Optional, caller-supplied fee table since PA-API doesn't expose one.
   *  Keyed by exact PA-API category display name; unmatched items stay
   *  `commissionType: "unknown"`. */
  categoryCommissionRates?: Record<string, Decimal>;
  categoryName?: string | null;
}

export function mapPaApiItem(
  item: PaApiItem,
  providerId: AffiliateNetwork,
  options: AmazonOfferMappingOptions = {},
): NormalizedOffer | null {
  const asin = item.ASIN;
  if (!asin) return null;

  const listing = item.Offers?.Listings?.[0];
  const price = listing?.Price?.Amount;
  const currency = listing?.Price?.Currency ?? null;

  const commissionRate =
    options.categoryName && options.categoryCommissionRates?.[options.categoryName]
      ? options.categoryCommissionRates[options.categoryName]
      : null;

  const raw: NormalizedOffer = {
    externalProductId: asin,
    externalOfferId: listing?.Id ?? null,
    title: item.ItemInfo?.Title?.DisplayValue ?? "",
    description: item.ItemInfo?.Features?.DisplayValues?.join(" ") ?? null,
    productUrl: item.DetailPageURL ?? `https://www.amazon.com/dp/${asin}`,
    affiliateUrl: item.DetailPageURL ?? null,
    priceAmount: typeof price === "number" ? new Decimal(price) : null,
    originalPriceAmount:
      typeof listing?.SavingBasis?.Amount === "number" ? new Decimal(listing.SavingBasis.Amount) : null,
    currency,
    commissionType: commissionRate ? "percentage" : "unknown",
    commissionRate,
    commissionAmount: null,
    availability: mapAvailability(listing?.Availability?.Type),
    sellerName: listing?.MerchantInfo?.Name ?? null,
    shippingCountryCodes: [],
    averageRating: null,
    ratingCount: null,
    sourceUpdatedAt: new Date(),
    gtin: item.ItemInfo?.ExternalIds?.EANs?.DisplayValues?.[0] ?? item.ItemInfo?.ExternalIds?.UPCs?.DisplayValues?.[0] ?? null,
    manufacturerPartNumber: item.ItemInfo?.ManufactureInfo?.Model?.DisplayValue ?? null,
    rawReferenceId: asin,
  };

  return normalizeOffer(raw);
}

export function mapPaApiItems(
  items: PaApiItem[] | undefined,
  providerId: AffiliateNetwork,
  options?: AmazonOfferMappingOptions,
): NormalizedOffer[] {
  if (!items) return [];
  const mapped: NormalizedOffer[] = [];
  for (const item of items) {
    const offer = mapPaApiItem(item, providerId, options);
    if (offer) mapped.push(offer);
  }
  return mapped;
}
