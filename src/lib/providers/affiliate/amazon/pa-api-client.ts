/**
 * PA-API 5.0 HTTP client. Builds a signed request, sends it, and returns the
 * parsed JSON body (or throws `ProductSourceHttpError`). No domain mapping
 * here — see `response-mapping.ts` for that.
 */
import { signSigV4 } from "./sigv4";
import { mapHttpStatusToFailureCode, mapPaApiErrorCode, ProductSourceHttpError } from "./errors";
import type {
  AmazonCredentials,
  AmazonMarketplaceConfig,
  PaApiErrorEntry,
  PaApiGetItemsResponse,
  PaApiSearchItemsResponse,
} from "./types";

const SERVICE = "ProductAdvertisingAPI";

/** PA-API 5.0 caps GetItems at 10 item ids per request. */
export const PA_API_GET_ITEMS_BATCH_SIZE = 10;

export interface PaApiFetcher {
  (url: string, init: { method: "POST"; headers: Record<string, string>; body: string }): Promise<{
    status: number;
    json(): Promise<unknown>;
  }>;
}

function throwOnErrors(errors: PaApiErrorEntry[] | undefined): void {
  if (!errors || errors.length === 0) return;
  const first = errors[0];
  throw new ProductSourceHttpError(mapPaApiErrorCode(first.Code), `${first.Code}: ${first.Message}`);
}

async function callPaApi(
  operation: "SearchItems" | "GetItems",
  body: Record<string, unknown>,
  credentials: AmazonCredentials,
  marketplace: AmazonMarketplaceConfig,
  fetcher: PaApiFetcher,
): Promise<unknown> {
  const path = `/paapi5/${operation.toLowerCase()}`;
  const url = `https://${marketplace.host}${path}`;
  const payload = JSON.stringify({
    ...body,
    PartnerTag: credentials.partnerTag,
    PartnerType: "Associates",
    Marketplace: marketplace.marketplace,
  });

  const target = `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${operation}`;
  const baseHeaders: Record<string, string> = {
    host: marketplace.host,
    "content-type": "application/json; charset=utf-8",
    "content-encoding": "amz-1.0",
    "x-amz-target": target,
  };

  const { amzDate, authorizationHeader } = signSigV4({
    method: "POST",
    path,
    headers: baseHeaders,
    body: payload,
    region: marketplace.region,
    service: SERVICE,
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
  });

  let response: { status: number; json(): Promise<unknown> };
  try {
    response = await fetcher(url, {
      method: "POST",
      headers: { ...baseHeaders, "x-amz-date": amzDate, authorization: authorizationHeader },
      body: payload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "network request failed";
    throw new ProductSourceHttpError("NETWORK_ERROR", message);
  }

  if (response.status >= 400) {
    throw new ProductSourceHttpError(
      mapHttpStatusToFailureCode(response.status),
      `PA-API ${operation} failed with HTTP ${response.status}`,
    );
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new ProductSourceHttpError("INVALID_RESPONSE", `PA-API ${operation} returned a non-JSON body`);
  }
  return json;
}

export async function searchItems(
  params: { keywords: string; searchIndex?: string; itemPage?: number },
  credentials: AmazonCredentials,
  marketplace: AmazonMarketplaceConfig,
  fetcher: PaApiFetcher,
): Promise<PaApiSearchItemsResponse> {
  const body = {
    Keywords: params.keywords,
    SearchIndex: params.searchIndex ?? "All",
    ItemPage: params.itemPage ?? 1,
    Resources: [
      "ItemInfo.Title",
      "ItemInfo.Features",
      "ItemInfo.ExternalIds",
      "Offers.Listings.Price",
      "Offers.Listings.Availability.Type",
      "Offers.Listings.MerchantInfo",
      "Images.Primary.Large",
    ],
  };
  const json = (await callPaApi("SearchItems", body, credentials, marketplace, fetcher)) as PaApiSearchItemsResponse;
  throwOnErrors(json.Errors);
  return json;
}

export async function getItems(
  itemIds: string[],
  credentials: AmazonCredentials,
  marketplace: AmazonMarketplaceConfig,
  fetcher: PaApiFetcher,
): Promise<PaApiGetItemsResponse> {
  if (itemIds.length === 0) return { ItemsResult: { Items: [] } };
  if (itemIds.length > PA_API_GET_ITEMS_BATCH_SIZE) {
    throw new ProductSourceHttpError(
      "UNSUPPORTED_OPERATION",
      `GetItems supports at most ${PA_API_GET_ITEMS_BATCH_SIZE} item ids per request, got ${itemIds.length}`,
    );
  }
  const body = {
    ItemIds: itemIds,
    Resources: [
      "ItemInfo.Title",
      "ItemInfo.Features",
      "ItemInfo.ExternalIds",
      "Offers.Listings.Price",
      "Offers.Listings.Availability.Type",
      "Offers.Listings.MerchantInfo",
      "Images.Primary.Large",
    ],
  };
  const json = (await callPaApi("GetItems", body, credentials, marketplace, fetcher)) as PaApiGetItemsResponse;
  throwOnErrors(json.Errors);
  return json;
}
