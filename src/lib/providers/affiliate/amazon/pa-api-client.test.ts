import { describe, it, expect, vi } from "vitest";
import { searchItems, getItems, PA_API_GET_ITEMS_BATCH_SIZE, type PaApiFetcher } from "./pa-api-client";
import { ProductSourceHttpError } from "./errors";
import { AMAZON_MARKETPLACES, type AmazonCredentials } from "./types";

const credentials: AmazonCredentials = {
  accessKeyId: "AKID",
  secretAccessKey: "secret",
  partnerTag: "mytag-21",
};
const marketplace = AMAZON_MARKETPLACES.DE;

function fetcherReturning(status: number, body: unknown): PaApiFetcher {
  return vi.fn().mockResolvedValue({ status, json: async () => body });
}

describe("searchItems", () => {
  it("sends a signed POST to the marketplace host and parses the response", async () => {
    const fetcher = fetcherReturning(200, {
      SearchResult: { Items: [{ ASIN: "B000TEST1" }], TotalResultCount: 1 },
    });
    const result = await searchItems({ keywords: "usb charger" }, credentials, marketplace, fetcher);

    expect(result.SearchResult?.Items?.[0]?.ASIN).toBe("B000TEST1");
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = (fetcher as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://webservices.amazon.de/paapi5/searchitems");
    expect(init.method).toBe("POST");
    expect(init.headers.authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=AKID\//);
    expect(init.headers["x-amz-target"]).toBe("com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems");
    const sentBody = JSON.parse(init.body);
    expect(sentBody.PartnerTag).toBe("mytag-21");
    expect(sentBody.Marketplace).toBe("www.amazon.de");
    expect(sentBody.Keywords).toBe("usb charger");
  });

  it("maps HTTP 401 to AUTHENTICATION_FAILED", async () => {
    const fetcher = fetcherReturning(401, {});
    await expect(searchItems({ keywords: "x" }, credentials, marketplace, fetcher)).rejects.toMatchObject({
      code: "AUTHENTICATION_FAILED",
    });
  });

  it("maps HTTP 429 to RATE_LIMITED (retryable)", async () => {
    const fetcher = fetcherReturning(429, {});
    const error = await searchItems({ keywords: "x" }, credentials, marketplace, fetcher).catch((e) => e);
    expect(error).toBeInstanceOf(ProductSourceHttpError);
    expect(error.code).toBe("RATE_LIMITED");
    expect(error.retryable).toBe(true);
  });

  it("maps HTTP 500 to PLATFORM_UNAVAILABLE (retryable)", async () => {
    const fetcher = fetcherReturning(500, {});
    const error = await searchItems({ keywords: "x" }, credentials, marketplace, fetcher).catch((e) => e);
    expect(error.code).toBe("PLATFORM_UNAVAILABLE");
    expect(error.retryable).toBe(true);
  });

  it("maps an in-body PA-API error (HTTP 200) to its domain failure code", async () => {
    const fetcher = fetcherReturning(200, {
      Errors: [{ Code: "InvalidPartnerTag", Message: "The PartnerTag is invalid." }],
    });
    const error = await searchItems({ keywords: "x" }, credentials, marketplace, fetcher).catch((e) => e);
    expect(error.code).toBe("AUTHENTICATION_FAILED");
    expect(error.message).toContain("InvalidPartnerTag");
  });

  it("maps a network failure to NETWORK_ERROR", async () => {
    const fetcher: PaApiFetcher = vi.fn().mockRejectedValue(new Error("fetch failed"));
    const error = await searchItems({ keywords: "x" }, credentials, marketplace, fetcher).catch((e) => e);
    expect(error.code).toBe("NETWORK_ERROR");
  });

  it("maps a non-JSON body to INVALID_RESPONSE", async () => {
    const fetcher: PaApiFetcher = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    });
    const error = await searchItems({ keywords: "x" }, credentials, marketplace, fetcher).catch((e) => e);
    expect(error.code).toBe("INVALID_RESPONSE");
  });
});

describe("getItems", () => {
  it("returns an empty result without calling the fetcher for an empty id list", async () => {
    const fetcher = fetcherReturning(200, {});
    const result = await getItems([], credentials, marketplace, fetcher);
    expect(result.ItemsResult?.Items).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it(`rejects more than ${PA_API_GET_ITEMS_BATCH_SIZE} item ids with UNSUPPORTED_OPERATION`, async () => {
    const fetcher = fetcherReturning(200, {});
    const tooMany = Array.from({ length: PA_API_GET_ITEMS_BATCH_SIZE + 1 }, (_, i) => `ASIN${i}`);
    const error = await getItems(tooMany, credentials, marketplace, fetcher).catch((e) => e);
    expect(error.code).toBe("UNSUPPORTED_OPERATION");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("sends exactly the requested item ids", async () => {
    const fetcher = fetcherReturning(200, { ItemsResult: { Items: [] } });
    await getItems(["ASIN1", "ASIN2"], credentials, marketplace, fetcher);
    const [, init] = (fetcher as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(init.body).ItemIds).toEqual(["ASIN1", "ASIN2"]);
  });
});
