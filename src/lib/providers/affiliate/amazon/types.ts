/**
 * Amazon Product Advertising API (PA-API 5.0) — adapter-local types.
 *
 * Kept separate from `@/features/products/domain/types` because these shapes
 * are Amazon-specific wire/config concepts, not domain concepts.
 */

/** Long-lived Associates credentials. Never logged; only ever passed by value
 *  from a caller that already decrypted them (this module never reads the
 *  vault itself — see `docs/architecture` for the credential-vault pattern). */
export interface AmazonCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  /** Associates tracking id, e.g. "mytag-21". Required on every request. */
  partnerTag: string;
}

/** One Amazon marketplace's PA-API endpoint + AWS signing region. */
export interface AmazonMarketplaceConfig {
  /** PA-API host, e.g. "webservices.amazon.de". */
  host: string;
  /** AWS region PA-API expects in the SigV4 credential scope for this host. */
  region: string;
  /** Value PA-API expects in the request body's `Marketplace` field. */
  marketplace: string;
}

export const AMAZON_MARKETPLACES = {
  DE: { host: "webservices.amazon.de", region: "eu-west-1", marketplace: "www.amazon.de" },
  US: { host: "webservices.amazon.com", region: "us-east-1", marketplace: "www.amazon.com" },
  GB: { host: "webservices.amazon.co.uk", region: "eu-west-1", marketplace: "www.amazon.co.uk" },
  FR: { host: "webservices.amazon.fr", region: "eu-west-1", marketplace: "www.amazon.fr" },
  IT: { host: "webservices.amazon.it", region: "eu-west-1", marketplace: "www.amazon.it" },
  ES: { host: "webservices.amazon.es", region: "eu-west-1", marketplace: "www.amazon.es" },
} as const satisfies Record<string, AmazonMarketplaceConfig>;

export type AmazonMarketplaceCode = keyof typeof AMAZON_MARKETPLACES;

/** PA-API's own error shape, present in the JSON body even on HTTP 200 for
 *  partial failures (e.g. an ASIN that doesn't exist in GetItems). */
export interface PaApiErrorEntry {
  Code: string;
  Message: string;
}

export interface PaApiPrice {
  Amount?: number;
  Currency?: string;
}

export interface PaApiAvailability {
  Type?: string;
  Message?: string;
}

export interface PaApiListing {
  Id?: string;
  Price?: PaApiPrice;
  SavingBasis?: PaApiPrice;
  Availability?: PaApiAvailability;
  MerchantInfo?: { Name?: string };
  DeliveryInfo?: { ShippingCharges?: PaApiPrice[] };
}

export interface PaApiItem {
  ASIN?: string;
  DetailPageURL?: string;
  ItemInfo?: {
    Title?: { DisplayValue?: string };
    Features?: { DisplayValues?: string[] };
    ExternalIds?: { EANs?: { DisplayValues?: string[] }; UPCs?: { DisplayValues?: string[] } };
    ManufactureInfo?: { Model?: { DisplayValue?: string } };
  };
  Offers?: { Listings?: PaApiListing[] };
  Images?: { Primary?: { Large?: { URL?: string } } };
}

export interface PaApiSearchItemsResponse {
  SearchResult?: { Items?: PaApiItem[]; TotalResultCount?: number };
  Errors?: PaApiErrorEntry[];
}

export interface PaApiGetItemsResponse {
  ItemsResult?: { Items?: PaApiItem[] };
  Errors?: PaApiErrorEntry[];
}
