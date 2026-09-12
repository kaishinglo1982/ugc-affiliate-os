import { describe, it, expect } from "vitest";
import { mapPaApiItem, mapPaApiItems } from "./response-mapping";
import { Decimal } from "@/lib/shared/decimal";
import type { PaApiItem } from "./types";

const fullItem: PaApiItem = {
  ASIN: "B000TEST1",
  DetailPageURL: "https://www.amazon.de/dp/B000TEST1?tag=mytag-21",
  ItemInfo: {
    Title: { DisplayValue: "Wireless Earbuds Pro" },
    Features: { DisplayValues: ["Noise cancelling", "20h battery"] },
    ExternalIds: { EANs: { DisplayValues: ["4006381333931"] } },
  },
  Offers: {
    Listings: [
      {
        Id: "listing-1",
        Price: { Amount: 29.99, Currency: "EUR" },
        Availability: { Type: "Now", Message: "In Stock." },
        MerchantInfo: { Name: "Amazon.de" },
      },
    ],
  },
  Images: { Primary: { Large: { URL: "https://images.example/x.jpg" } } },
};

describe("mapPaApiItem", () => {
  it("maps a full item to a normalized offer", () => {
    const offer = mapPaApiItem(fullItem, "AMAZON_ASSOCIATES");
    expect(offer).not.toBeNull();
    expect(offer?.externalProductId).toBe("B000TEST1");
    expect(offer?.title).toBe("Wireless Earbuds Pro");
    expect(offer?.priceAmount?.toString()).toBe("29.99");
    expect(offer?.currency).toBe("EUR");
    expect(offer?.availability).toBe("in_stock");
    expect(offer?.sellerName).toBe("Amazon.de");
    expect(offer?.gtin).toBe("4006381333931");
  });

  it("returns null for an item without an ASIN", () => {
    expect(mapPaApiItem({}, "AMAZON_ASSOCIATES")).toBeNull();
  });

  it("leaves commission unknown when no fee table is supplied", () => {
    const offer = mapPaApiItem(fullItem, "AMAZON_ASSOCIATES");
    expect(offer?.commissionType).toBe("unknown");
    expect(offer?.commissionRate).toBeNull();
    expect(offer?.commissionAmount).toBeNull();
  });

  it("applies a caller-supplied category commission rate when the category matches", () => {
    const offer = mapPaApiItem(fullItem, "AMAZON_ASSOCIATES", {
      categoryName: "Electronics",
      categoryCommissionRates: { Electronics: new Decimal("0.03") },
    });
    expect(offer?.commissionType).toBe("percentage");
    expect(offer?.commissionRate?.toString()).toBe("0.03");
  });

  it("never fabricates a rating — always null, PA-API doesn't provide one via these resources", () => {
    const offer = mapPaApiItem(fullItem, "AMAZON_ASSOCIATES");
    expect(offer?.averageRating).toBeNull();
    expect(offer?.ratingCount).toBeNull();
  });

  it("maps missing offer/price data to nulls instead of throwing", () => {
    const offer = mapPaApiItem({ ASIN: "B0NOOFFER" }, "AMAZON_ASSOCIATES");
    expect(offer?.priceAmount).toBeNull();
    expect(offer?.currency).toBeNull();
    expect(offer?.availability).toBe("unknown");
  });

  it.each([
    ["Now", "in_stock"],
    ["OutOfStock", "out_of_stock"],
    ["PreOrder", "preorder"],
    ["LimitedAvailability", "limited"],
    ["SomethingUnknown", "unknown"],
    [undefined, "unknown"],
  ] as const)("maps PA-API availability %s to %s", (type, expected) => {
    const item: PaApiItem = { ASIN: "B0AVAIL", Offers: { Listings: [{ Availability: { Type: type } }] } };
    expect(mapPaApiItem(item, "AMAZON_ASSOCIATES")?.availability).toBe(expected);
  });
});

describe("mapPaApiItems", () => {
  it("maps a list and drops items without an ASIN", () => {
    const offers = mapPaApiItems([fullItem, {}, { ASIN: "B0SECOND" }], "AMAZON_ASSOCIATES");
    expect(offers).toHaveLength(2);
    expect(offers.map((o) => o.externalProductId)).toEqual(["B000TEST1", "B0SECOND"]);
  });

  it("returns an empty array for undefined input", () => {
    expect(mapPaApiItems(undefined, "AMAZON_ASSOCIATES")).toEqual([]);
  });
});
