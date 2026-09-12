import { describe, it, expect, vi } from "vitest";
import { AmazonProductSource } from "./product-source";
import { AMAZON_MARKETPLACES, type AmazonCredentials } from "./types";
import { PA_API_GET_ITEMS_BATCH_SIZE, type PaApiFetcher } from "./pa-api-client";

const credentials: AmazonCredentials = {
  accessKeyId: "AKID",
  secretAccessKey: "secret",
  partnerTag: "mytag-21",
};

function fetcherReturning(status: number, body: unknown): PaApiFetcher {
  return vi.fn().mockResolvedValue({ status, json: async () => body });
}

function baseSearchRequest(overrides: Partial<Parameters<AmazonProductSource["searchProducts"]>[0]> = {}) {
  return {
    workspaceId: "ws1",
    correlationId: "corr1",
    keywords: ["usb", "charger"],
    excludedKeywords: [],
    categoryIds: [],
    targetCountryCodes: ["DE"],
    languageCodes: ["de"],
    requireInStock: false,
    providerId: "AMAZON_ASSOCIATES" as const,
    cursor: null,
    limit: 10,
    ...overrides,
  };
}

describe("AmazonProductSource", () => {
  it("declares reduced capabilities (no commission data, no ratings)", () => {
    const source = new AmazonProductSource(credentials, AMAZON_MARKETPLACES.DE);
    const caps = source.getCapabilities();
    expect(caps.supportsCommissionData).toBe(false);
    expect(caps.supportsRatings).toBe(false);
    expect(caps.supportsKeywordSearch).toBe(true);
  });

  it("searchProducts joins keywords and maps the response", async () => {
    const fetcher = fetcherReturning(200, {
      SearchResult: { Items: [{ ASIN: "B0001" }], TotalResultCount: 1 },
    });
    const source = new AmazonProductSource(credentials, AMAZON_MARKETPLACES.DE, { fetcher });
    const result = await source.searchProducts(baseSearchRequest());

    expect(result.provider).toBe("AMAZON_ASSOCIATES");
    expect(result.offers).toHaveLength(1);
    expect(result.offers[0].externalProductId).toBe("B0001");
    const [, init] = (fetcher as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(init.body).Keywords).toBe("usb charger");
  });

  it("returns null nextCursor when there is nothing more to page through", async () => {
    const fetcher = fetcherReturning(200, {
      SearchResult: { Items: [{ ASIN: "B0001" }], TotalResultCount: 1 },
    });
    const source = new AmazonProductSource(credentials, AMAZON_MARKETPLACES.DE, { fetcher });
    const result = await source.searchProducts(baseSearchRequest());
    expect(result.nextCursor).toBeNull();
  });

  it("getProduct returns null offer (not an error) when PA-API finds nothing", async () => {
    const fetcher = fetcherReturning(200, { ItemsResult: { Items: [] } });
    const source = new AmazonProductSource(credentials, AMAZON_MARKETPLACES.DE, { fetcher });
    const result = await source.getProduct({
      workspaceId: "ws1",
      correlationId: "c1",
      providerId: "AMAZON_ASSOCIATES",
      externalProductId: "B0MISSING",
    });
    expect(result.offer).toBeNull();
  });

  it("getOfferUpdates batches more than 10 ids into multiple PA-API calls", async () => {
    const fetcher = fetcherReturning(200, { ItemsResult: { Items: [{ ASIN: "X" }] } });
    const source = new AmazonProductSource(credentials, AMAZON_MARKETPLACES.DE, { fetcher });
    const ids = Array.from({ length: PA_API_GET_ITEMS_BATCH_SIZE + 3 }, (_, i) => `ASIN${i}`);

    const result = await source.getOfferUpdates({
      workspaceId: "ws1",
      correlationId: "c1",
      providerId: "AMAZON_ASSOCIATES",
      externalProductIds: ids,
    });

    expect(fetcher).toHaveBeenCalledTimes(2); // 10 + 3
    expect(result.offers).toHaveLength(2); // one mapped item per batch response
  });

  it("validateConnection reports connected: true on a successful call", async () => {
    const fetcher = fetcherReturning(200, { SearchResult: { Items: [] } });
    const source = new AmazonProductSource(credentials, AMAZON_MARKETPLACES.DE, { fetcher });
    const result = await source.validateConnection("program-1");
    expect(result).toEqual({ provider: "AMAZON_ASSOCIATES", connected: true, failureCode: null, detail: null });
  });

  it("validateConnection maps an auth failure instead of throwing", async () => {
    const fetcher = fetcherReturning(401, {});
    const source = new AmazonProductSource(credentials, AMAZON_MARKETPLACES.DE, { fetcher });
    const result = await source.validateConnection("program-1");
    expect(result.connected).toBe(false);
    expect(result.failureCode).toBe("AUTHENTICATION_FAILED");
  });
});
