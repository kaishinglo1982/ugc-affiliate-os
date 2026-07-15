import { describe, it, expect } from "vitest";
import {
  matchesExternalId,
  normalizeIdentifier,
  matchByGtin,
  matchByManufacturerPartNumber,
  matchByNormalizedName,
  fuzzyMatch,
  resolveMatch,
} from "@/features/products/domain/deduplication";
import { type NormalizedOffer } from "@/features/products/domain/types";

function makeOffer(overrides: Partial<NormalizedOffer> = {}): NormalizedOffer {
  return {
    externalProductId: "ext-1",
    externalOfferId: null,
    title: "Wireless Earbuds Pro",
    description: null,
    productUrl: "https://example.com/p",
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
    ...overrides,
  };
}

describe("deduplication — external id & identifier", () => {
  it("matches external ids case-insensitively and trimmed", () => {
    expect(matchesExternalId("  ABC-123 ", "abc-123")).toBe(true);
    expect(matchesExternalId(null, "abc-123")).toBe(false);
  });

  it("normalizes identifiers", () => {
    expect(normalizeIdentifier("AB-12 3!")).toBe("ab123");
  });
});

describe("deduplication — gtin & mpn", () => {
  it("matches gtin exactly", () => {
    const r = matchByGtin("0123456789012", "0123456789012");
    expect(r?.method).toBe("gtin");
    expect(r?.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("returns null on gtin mismatch", () => {
    expect(matchByGtin("123", "456")).toBeNull();
    expect(matchByGtin(null, "456")).toBeNull();
  });

  it("matches manufacturer part number", () => {
    const r = matchByManufacturerPartNumber("MPN-9", "mpn-9");
    expect(r?.method).toBe("manufacturer_part_number");
  });
});

describe("deduplication — normalized name & fuzzy", () => {
  it("matches exact normalized names with high confidence", () => {
    const r = matchByNormalizedName("Wireless Earbuds Pro", "wireless earbuds pro");
    expect(r?.method).toBe("normalized_name");
    expect(r?.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it("matches similar names with lower but >=0.6 confidence", () => {
    const r = matchByNormalizedName("Wireless Earbuds Pro X", "Wireless Earbuds Pro");
    expect(r).not.toBeNull();
    expect(r!.confidence).toBeGreaterThanOrEqual(0.6);
    expect(r!.confidence).toBeLessThan(0.95);
  });

  it("returns null for dissimilar names", () => {
    expect(matchByNormalizedName("Garden Hose", "Wireless Earbuds Pro")).toBeNull();
  });

  it("fuzzy returns only near (not exact) matches in [0.6,0.9)", () => {
    const exact = fuzzyMatch("Wireless Earbuds Pro", "wireless earbuds pro");
    expect(exact).toBeNull();
    // Character-level similarity catches a typo that word-Jaccard misses.
    const near = fuzzyMatch("Wireless Earbuds", "Wireles Earbud");
    expect(near?.method).toBe("fuzzy");
    expect(near!.confidence).toBeGreaterThanOrEqual(0.6);
    expect(near!.confidence).toBeLessThan(0.9);
  });
});

describe("deduplication — resolveMatch priority", () => {
  const candidate = makeOffer({
    externalProductId: "ext-new",
    gtin: "GTIN-1",
    manufacturerPartNumber: "MPN-1",
    title: "Wireless Earbuds Pro",
  });

  it("prefers external id over other methods", () => {
    const r = resolveMatch(
      { externalProductId: "EXT-NEW", gtin: "other", normalizedName: "Different" },
      candidate,
    );
    expect(r?.method).toBe("external_id");
  });

  it("falls back to gtin then mpn then name", () => {
    const byGtin = resolveMatch(
      { externalProductId: "no", gtin: "GTIN-1", normalizedName: "Different" },
      candidate,
    );
    expect(byGtin?.method).toBe("gtin");

    const byMpn = resolveMatch(
      { externalProductId: "no", gtin: null, manufacturerPartNumber: "MPN-1", normalizedName: "Different" },
      candidate,
    );
    expect(byMpn?.method).toBe("manufacturer_part_number");

    const byName = resolveMatch(
      { externalProductId: "no", gtin: null, manufacturerPartNumber: null, normalizedName: "wireless earbuds pro" },
      candidate,
    );
    expect(byName?.method).toBe("normalized_name");
  });

  it("returns fuzzy only when no stronger match", () => {
    const typoCandidate = makeOffer({
      externalProductId: "ext-new",
      gtin: null,
      manufacturerPartNumber: null,
      title: "Wireles Earbud",
    });
    const r = resolveMatch(
      { externalProductId: null, gtin: null, manufacturerPartNumber: null, normalizedName: "Wireless Earbuds" },
      typoCandidate,
    );
    expect(r?.method).toBe("fuzzy");
  });

  it("returns null for completely dissimilar products", () => {
    const r = resolveMatch(
      { externalProductId: null, gtin: null, manufacturerPartNumber: null, normalizedName: "Garden Hose" },
      candidate,
    );
    expect(r).toBeNull();
  });
});
