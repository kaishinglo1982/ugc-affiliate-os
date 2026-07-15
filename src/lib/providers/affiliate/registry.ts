/**
 * Affiliate provider registry (infrastructure).
 *
 * Maps each `AffiliateNetwork` to its capabilities and resolves a
 * `ProductSourcePort`. Live adapters are skeletons/disabled for now, so the
 * registry always returns the deterministic mock provider; the structure leaves
 * room to plug a real adapter in later. No runtime Prisma imports.
 */
import {
  type AffiliateNetwork,
  type ProductSourcePort,
  type ProductSourceCapabilities,
} from "@/features/products/domain/types";
import { createMockProvider } from "@/lib/providers/affiliate/mock-provider";

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
}

/**
 * Resolves a product source port for the given provider. Live adapters are not
 * implemented yet, so a deterministic mock is always returned.
 */
export function getProductSourceProvider(
  providerId: AffiliateNetwork,
  _opts?: ProviderResolutionOptions,
): ProductSourcePort {
  return createMockProvider(providerId);
}

/** All providers declared in the system (registry is pure; flags checked upstream). */
export function listEnabledProviders(): AffiliateNetwork[] {
  return [...ALL_PROVIDERS];
}
