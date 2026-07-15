import { describe, it, expect } from "vitest";
import { classifyOffers, nextProductStatus, type ExistingProductLike } from "./core";
import type { NormalizedOffer } from "@/features/products/domain/types";

function makeOffer(externalProductId: string, title: string): NormalizedOffer {
  return {
    externalProductId,
    externalOfferId: null,
    title,
    description: null,
    productUrl: "https://example.com/p/" + externalProductId,
    affiliateUrl: null,
    priceAmount: null,
    originalPriceAmount: null,
    currency: null,
    commissionType: "unknown",
    commissionRate: null,
    commissionAmount: null,
    availability: "unknown",
    sellerName: null,
    shippingCountryCodes: [],
    averageRating: null,
    ratingCount: null,
    sourceUpdatedAt: null,
    gtin: null,
    manufacturerPartNumber: null,
    rawReferenceId: null,
  };
}

describe("classifyOffers", () => {
  const existing: ExistingProductLike[] = [
    {
      id: "p1",
      canonicalName: "Wireless Earbuds",
      gtin: null,
      manufacturerPartNumber: null,
      externalIds: ["ext-1"],
    },
  ];

  it("matches by external id and by normalized name, and queues the rest for creation", () => {
    const offers = [
      makeOffer("ext-1", "Anything"), // matches via external_id
      makeOffer("ext-3", "Wireless Earbuds"), // matches via normalized_name
      makeOffer("ext-9", "Totally Unrelated Gadget"), // no match -> create
    ];

    const result = classifyOffers(offers, existing);

    expect(result.matched.length).toBe(2);
    expect(result.toCreate.length).toBe(1);
    expect(result.toCreate[0].externalProductId).toBe("ext-9");
    expect(result.duplicates).toEqual(["p1", "p1"]);

    const byMethod = result.matched.find((m) => m.method === "external_id");
    expect(byMethod?.productId).toBe("p1");
    const byName = result.matched.find((m) => m.method === "normalized_name");
    expect(byName?.productId).toBe("p1");
  });

  it("treats a non-matching offer set as all toCreate", () => {
    const offers = [makeOffer("ext-7", "Something Else")];
    const result = classifyOffers(offers, existing);
    expect(result.toCreate.length).toBe(1);
    expect(result.matched.length).toBe(0);
    expect(result.duplicates.length).toBe(0);
  });
});

describe("nextProductStatus", () => {
  it("maps lifecycle actions to product statuses", () => {
    expect(nextProductStatus("approve")).toBe("approved");
    expect(nextProductStatus("reject")).toBe("rejected");
    expect(nextProductStatus("archive")).toBe("archived");
  });
});
