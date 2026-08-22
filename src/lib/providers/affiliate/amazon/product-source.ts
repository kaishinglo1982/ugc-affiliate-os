/**
 * Real Amazon PA-API 5.0 implementation of `ProductSourcePort`.
 *
 * Additive only: nothing in `registry.ts` returns this by default (see there
 * for the opt-in wiring). Requires real Associates credentials; there is no
 * live-network test for this file for that reason — `pa-api-client.test.ts`
 * and `response-mapping.test.ts` cover request construction, signing, error
 * mapping and offer mapping with an injected fetcher instead.
 */
import type {
  AffiliateNetwork,
  NormalizedOffer,
  ProductLookupRequest,
  ProductLookupResult,
  ProductOfferUpdateRequest,
  ProductOfferUpdateResult,
  ProductSearchRequest,
  ProductSearchResult,
  ProductSourceCapabilities,
  ProductSourceConnectionResult,
  ProductSourcePort,
} from "@/features/products/domain/types";
import { getItems, searchItems, PA_API_GET_ITEMS_BATCH_SIZE, type PaApiFetcher } from "./pa-api-client";
import { mapPaApiItems } from "./response-mapping";
import { ProductSourceHttpError } from "./errors";
import type { AmazonCredentials, AmazonMarketplaceConfig } from "./types";

const defaultFetcher: PaApiFetcher = async (url, init) => {
  const response = await fetch(url, init);
  return { status: response.status, json: () => response.json() };
};

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export interface AmazonProductSourceOptions {
  /** Injectable for tests; defaults to the platform `fetch`. */
  fetcher?: PaApiFetcher;
}

export class AmazonProductSource implements ProductSourcePort {
  readonly providerId: AffiliateNetwork = "AMAZON_ASSOCIATES";
  private readonly credentials: AmazonCredentials;
  private readonly marketplace: AmazonMarketplaceConfig;
  private readonly fetcher: PaApiFetcher;

  constructor(credentials: AmazonCredentials, marketplace: AmazonMarketplaceConfig, options: AmazonProductSourceOptions = {}) {
    this.credentials = credentials;
    this.marketplace = marketplace;
    this.fetcher = options.fetcher ?? defaultFetcher;
  }

  getCapabilities(): ProductSourceCapabilities {
    return {
      supportsKeywordSearch: true,
      supportsCategorySearch: true,
      // No commission data (PA-API doesn't expose fee rates) and no ratings
      // (not requested/available via these resources) — see response-mapping.ts.
      supportsPriceFilter: false,
      supportsCommissionData: false,
      supportsAvailability: true,
      supportsRatings: false,
      supportsIncrementalUpdates: true,
    };
  }

  async validateConnection(_affiliateProgramId: string): Promise<ProductSourceConnectionResult> {
    try {
      await searchItems({ keywords: "test", itemPage: 1 }, this.credentials, this.marketplace, this.fetcher);
      return { provider: this.providerId, connected: true, failureCode: null, detail: null };
    } catch (error) {
      if (error instanceof ProductSourceHttpError) {
        return { provider: this.providerId, connected: false, failureCode: error.code, detail: error.message };
      }
      const message = error instanceof Error ? error.message : "unknown_error";
      return { provider: this.providerId, connected: false, failureCode: "UNKNOWN_ERROR", detail: message };
    }
  }

  async searchProducts(request: ProductSearchRequest): Promise<ProductSearchResult> {
    const response = await searchItems(
      { keywords: request.keywords.join(" "), itemPage: request.cursor ? Number(request.cursor) : 1 },
      this.credentials,
      this.marketplace,
      this.fetcher,
    );
    const offers = mapPaApiItems(response.SearchResult?.Items, this.providerId);
    const total = response.SearchResult?.TotalResultCount ?? offers.length;
    const currentPage = request.cursor ? Number(request.cursor) : 1;
    const hasMore = offers.length > 0 && currentPage * offers.length < total;
    return {
      provider: this.providerId,
      offers,
      nextCursor: hasMore ? String(currentPage + 1) : null,
      rawResponseSize: JSON.stringify(response).length,
    };
  }

  async getProduct(request: ProductLookupRequest): Promise<ProductLookupResult> {
    const response = await getItems([request.externalProductId], this.credentials, this.marketplace, this.fetcher);
    const offers = mapPaApiItems(response.ItemsResult?.Items, this.providerId);
    return { provider: this.providerId, offer: offers[0] ?? null };
  }

  async getOfferUpdates(request: ProductOfferUpdateRequest): Promise<ProductOfferUpdateResult> {
    const batches = chunk(request.externalProductIds, PA_API_GET_ITEMS_BATCH_SIZE);
    const offers: NormalizedOffer[] = [];
    for (const batch of batches) {
      const response = await getItems(batch, this.credentials, this.marketplace, this.fetcher);
      offers.push(...mapPaApiItems(response.ItemsResult?.Items, this.providerId));
    }
    return { provider: this.providerId, offers };
  }
}

export function createAmazonProductSource(
  credentials: AmazonCredentials,
  marketplace: AmazonMarketplaceConfig,
  options?: AmazonProductSourceOptions,
): ProductSourcePort {
  return new AmazonProductSource(credentials, marketplace, options);
}
