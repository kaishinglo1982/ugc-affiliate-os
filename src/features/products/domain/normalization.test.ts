import { describe, it, expect } from "vitest";
import {
  stripHtml,
  normalizeWhitespace,
  normalizeUnicode,
  normalizeProductName,
  normalizeDescription,
  normalizeBrand,
  validateUrl,
  stripTrackingParams,
  normalizeUrl,
  validateCurrency,
  validateCountryCode,
  validateLanguageCode,
  normalizeOffer,
  RESTRICTED_URL_PARAMS,
  KNOWN_CURRENCIES,
} from "@/features/products/domain/normalization";
import { Decimal } from "@/lib/shared/decimal";
import { type NormalizedOffer } from "@/features/products/domain/types";

describe("normalization — html & whitespace", () => {
  it("strips html tags and decodes entities", () => {
    expect(stripHtml("<p>Hello &amp; <b>World</b></p>")).toBe("Hello & World");
    expect(stripHtml("Price: &#8364; 19,99")).toBe("Price: € 19,99");
  });

  it("normalizes whitespace", () => {
    expect(normalizeWhitespace("  a   b\n\tc ")).toBe("a b c");
  });

  it("applies NFKC unicode normalization", () => {
    expect(normalizeUnicode("ﬁ²")).toBe("fi2");
  });

  it("normalizes product names and truncates descriptions", () => {
    expect(normalizeProductName("  <i>Super</i>   Headphones ")).toBe("Super Headphones");
    const long = "x".repeat(6000);
    const out = normalizeDescription(long);
    expect(out).not.toBeNull();
    expect(out!.length).toBe(5000);
  });

  it("keeps null brand as null", () => {
    expect(normalizeBrand(null)).toBeNull();
    expect(normalizeBrand("  ")).toBeNull();
    expect(normalizeBrand(" BrandX ")).toBe("BrandX");
  });
});

describe("normalization — url validation", () => {
  it("rejects private / loopback hosts", () => {
    expect(validateUrl("http://localhost/p").valid).toBe(false);
    expect(validateUrl("http://127.0.0.1/p").valid).toBe(false);
    expect(validateUrl("http://192.168.0.1/p").valid).toBe(false);
    expect(validateUrl("http://10.0.0.5/p").valid).toBe(false);
  });

  it("rejects non-http protocols", () => {
    expect(validateUrl("javascript:alert(1)").valid).toBe(false);
    expect(validateUrl("ftp://example.com").valid).toBe(false);
  });

  it("rejects malformed urls", () => {
    expect(validateUrl("not a url").valid).toBe(false);
    expect(validateUrl(null).valid).toBe(false);
  });

  it("flags tracking params as not safe but still valid", () => {
    const r = validateUrl("https://example.com/p?utm_source=x&tag=1");
    expect(r.valid).toBe(true);
    expect(r.safe).toBe(false);
  });

  it("strips restricted tracking params but keeps path and other params", () => {
    expect(RESTRICTED_URL_PARAMS.has("utm_*")).toBe(true);
    const out = stripTrackingParams("https://example.com/p?ref=1&color=red&gclid=abc");
    expect(out).toBe("https://example.com/p?color=red");
  });

  it("normalizeUrl returns null for invalid and stripped absolute for valid", () => {
    expect(normalizeUrl("http://localhost")).toBeNull();
    expect(normalizeUrl("https://example.com/p?fbclid=x&id=5")).toBe("https://example.com/p?id=5");
  });
});

describe("normalization — currency / country / language", () => {
  it("validates known currencies only", () => {
    expect(validateCurrency("EUR")).toBe(true);
    expect(validateCurrency("USD")).toBe(true);
    expect(KNOWN_CURRENCIES.has("JPY")).toBe(true);
    expect(validateCurrency("eu")).toBe(false);
    expect(validateCurrency("EURO")).toBe(false);
    expect(validateCurrency(null)).toBe(false);
  });

  it("validates ISO country codes", () => {
    expect(validateCountryCode("DE")).toBe(true);
    expect(validateCountryCode("US")).toBe(true);
    expect(validateCountryCode("de")).toBe(false);
    expect(validateCountryCode("XYZ")).toBe(false);
  });

  it("validates 2-letter lowercase language codes", () => {
    expect(validateLanguageCode("de")).toBe(true);
    expect(validateLanguageCode("EN")).toBe(false);
    expect(validateLanguageCode("d")).toBe(false);
  });
});

describe("normalization — normalizeOffer", () => {
  it("does not mutate input and clamps ratings", () => {
    const offer: NormalizedOffer = {
      externalProductId: "p1",
      externalOfferId: null,
      title: "  <b>Widget</b> ",
      description: "<p>Great</p>",
      productUrl: "https://example.com/p?gclid=x",
      affiliateUrl: null,
      priceAmount: new Decimal(10),
      originalPriceAmount: null,
      currency: "EUR",
      commissionType: "percentage",
      commissionRate: new Decimal(0.1),
      commissionAmount: null,
      availability: "in_stock",
      sellerName: null,
      shippingCountryCodes: ["DE"],
      averageRating: new Decimal(7),
      ratingCount: -5n,
      sourceUpdatedAt: null,
      gtin: null,
      manufacturerPartNumber: null,
      rawReferenceId: null,
    };
    const out = normalizeOffer(offer);
    expect(offer.title).toBe("  <b>Widget</b> ");
    expect(out.title).toBe("Widget");
    expect(out.averageRating!.toString()).toBe("5");
    expect(out.ratingCount).toBe(0n);
    expect(out.productUrl).toBe("https://example.com/p");
    expect(out.currency).toBe("EUR");
  });

  it("nulls invalid currency", () => {
    const offer: NormalizedOffer = {
      externalProductId: "p2",
      externalOfferId: null,
      title: "X",
      description: null,
      productUrl: "https://example.com/p",
      affiliateUrl: null,
      priceAmount: null,
      originalPriceAmount: null,
      currency: "BAD",
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
    expect(normalizeOffer(offer).currency).toBeNull();
  });
});
