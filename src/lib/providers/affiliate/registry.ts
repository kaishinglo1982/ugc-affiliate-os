/**
 * Affiliate provider registry (infrastructure).
 *
 * Maps each `AffiliateNetwork` to its capabilities and resolves a
 * `ProductSourcePort`. Only `AMAZON_ASSOCIATES` has a real adapter so far
 * (`./amazon`); every other provider, and Amazon itself when no credentials
 * are supplied, still resolves to the deterministic mock. This function's
 * default behavior for existing callers is unchanged: `getProductSourceProvider(provider)`
 * with no `opts` still always returns the mock, exactly as before. Wiring a
 * caller to pass real, decrypted credentials here (e.g. from
 * `AffiliateProgram` + the credential vault) is a separate, deliberate
 * change — not done as part of adding this adapter. No runtime Prisma imports.
 */
import {
  type AffiliateNetwork,
  type ProductSourcePort,
  type ProductSourceCapabilities,
} from "@/features/products/domain/types";
import { createMockProvider } from "@/lib/providers/affiliate/mock-provider";
import { createAmazonProductSource } from "@/lib/providers/affiliate/amazon/product-source";
import type { AmazonCredentials, AmazonMarketplaceCode } from "@/lib/providers/affiliate/amazon/types";
import { AMAZON_MARKETPLACES } from "@/lib/providers/affiliate/amazon/types";

/** Local mirror of `AffiliateProviderKey` values (avoid importing Prisma). */
export const ALL_PROVIDERS: AffiliateNetwork[] = [
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
];

const FULL_CAPABILITIES: ProductSourceCapabilities = {
  supportsKeywordSearch: true,
  supportsCategorySearch: true,
  supportsPriceFilter: true,
  supportsCommissionData: true,
  supportsAvailability: true,
  supportsRatings: true,
  supportsIncrementalUpdates: true,
};

const CUSTOM_CAPABILITIES: ProductSourceCapabilities = {
  supportsKeywordSearch: false,
  supportsCategorySearch: false,
  supportsPriceFilter: false,
  supportsCommissionData: false,
  supportsAvailability: false,
  supportsRatings: false,
  supportsIncrementalUpdates: false,
};

export const PROVIDER_CAPABILITIES: Record<AffiliateNetwork, ProductSourceCapabilities> =
  ALL_PROVIDERS.reduce((acc, provider) => {
    acc[provider] = provider === "CUSTOM" ? CUSTOM_CAPABILITIES : { ...FULL_CAPABILITIES };
    return acc;
  }, {} as Record<AffiliateNetwork, ProductSourceCapabilities>);

export interface ProviderResolutionOptions {
  mock?: boolean;
  /** Real Associates credentials. Only used when `providerId` is
   *  `AMAZON_ASSOCIATES` and `mock` is not `true` — the caller is responsible
   *  for decrypting these from the credential vault before calling here;
   *  this registry never reads Prisma or the vault itself. */
  amazon?: { credentials: AmazonCredentials; marketplace: AmazonMarketplaceCode };
}

/**
 * Resolves a product source port for the given provider. Returns a real
 * adapter only for `AMAZON_ASSOCIATES` with credentials supplied and
 * `mock !== true`; every other case returns the deterministic mock.
 */
export function getProductSourceProvider(
  providerId: AffiliateNetwork,
  opts?: ProviderResolutionOptions,
): ProductSourcePort {
  if (providerId === "AMAZON_ASSOCIATES" && opts?.mock !== true && opts?.amazon) {
    const { credentials, marketplace } = opts.amazon;
    return createAmazonProductSource(credentials, AMAZON_MARKETPLACES[marketplace]);
  }
  return createMockProvider(providerId);
}

/** All providers declared in the system (registry is pure; flags checked upstream). */
export function listEnabledProviders(): AffiliateNetwork[] {
  return [...ALL_PROVIDERS];
}
