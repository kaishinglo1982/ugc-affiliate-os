/**
 * Mock affiliate product source (infrastructure / provider port).
 *
 * Deterministic in-memory implementation of `ProductSourcePort`. No network
 * calls, no real credentials, no randomness. Different provider ids yield
 * different but stable offers (derived from a hash of the provider id).
 */
import { Decimal } from "@/lib/shared/decimal";
import {
  type AffiliateNetwork,
  type NormalizedOffer,
  type ProductSourcePort,
  type ProductSearchRequest,
  type ProductSearchResult,
  type ProductLookupRequest,
  type ProductLookupResult,
  type ProductOfferUpdateRequest,
  type ProductOfferUpdateResult,
  type ProductSourceConnectionResult,
  type ProductSourceCapabilities,
} from "@/features/products/domain/types";
import { normalizeOffer } from "@/features/products/domain/normalization";

const BASE_PRODUCTS = [
  "Wireless Earbuds",
  "Smart Watch",
  "USB-C Charger",
  "Bluetooth Speaker",
  "Fitness Tracker",
  "Mechanical Keyboard",
  "LED Desk Lamp",
  "Phone Stand",
];

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeOffer(providerId: AffiliateNetwork, index: number): NormalizedOffer {
  const seed = hashString(`${providerId}::${index}`);
  const base = BASE_PRODUCTS[seed % BASE_PRODUCTS.length];
  const externalProductId = `${providerId.toLowerCase()}-${index + 1}`;
  const price = new Decimal(19.99 + (seed % 8000) / 100);
  const now = new Date();
  const raw: NormalizedOffer = {
    externalProductId,
    externalOfferId: null,
    title: `Mock ${base}`,
    description: `High-quality ${base.toLowerCase()} offered via ${providerId} mock source.`,
    productUrl: `https://example.com/p/${externalProductId}`,
    affiliateUrl: null,
    priceAmount: price,
    originalPriceAmount: null,
    currency: "EUR",
    commissionType: "percentage",
    commissionRate: new Decimal(0.08),
    commissionAmount: null,
    availability: "in_stock",
    sellerName: null,
    shippingCountryCodes: ["DE"],
    averageRating: new Decimal(4.3),
    ratingCount: 120n,
    sourceUpdatedAt: now,
    gtin: null,
    manufacturerPartNumber: null,
    rawReferenceId: null,
  };
  return normalizeOffer(raw);
}

export class MockProductSource implements ProductSourcePort {
  readonly providerId: AffiliateNetwork;

  constructor(providerId: AffiliateNetwork) {
    this.providerId = providerId;
  }

  getCapabilities(): ProductSourceCapabilities {
    return {
      supportsKeywordSearch: true,
      supportsCategorySearch: true,
      supportsPriceFilter: true,
      supportsCommissionData: true,
      supportsAvailability: true,
      supportsRatings: true,
      supportsIncrementalUpdates: true,
    };
  }

  async validateConnection(_affiliateProgramId: string): Promise<ProductSourceConnectionResult> {
    return {
      provider: this.providerId,
      connected: true,
      failureCode: null,
      detail: "Mock provider — always connected",
    };
  }

  async searchProducts(request: ProductSearchRequest): Promise<ProductSearchResult> {
    const excluded = request.excludedKeywords.map((k) => k.toLowerCase());
    const offers: NormalizedOffer[] = [];
    for (let i = 0; i < 4; i++) {
      const offer = makeOffer(this.providerId, i);
      const titleLower = offer.title.toLowerCase();
      if (excluded.some((kw) => titleLower.includes(kw))) continue;
      offers.push(offer);
    }
    return {
      provider: this.providerId,
      offers,
      nextCursor: null,
      rawResponseSize: 0,
    };
  }

  async getProduct(request: ProductLookupRequest): Promise<ProductLookupResult> {
    const offer = this.resolveByExternalId(request.externalProductId);
    return { provider: this.providerId, offer };
  }

  async getOfferUpdates(request: ProductOfferUpdateRequest): Promise<ProductOfferUpdateResult> {
    const offers = request.externalProductIds
      .map((id) => this.resolveByExternalId(id))
      .filter((o): o is NormalizedOffer => o !== null);
    return { provider: this.providerId, offers };
  }

  private resolveByExternalId(externalProductId: string): NormalizedOffer | null {
    if (!externalProductId) return null;
    const seed = hashString(`${this.providerId}::${externalProductId}`);
    const base = BASE_PRODUCTS[seed % BASE_PRODUCTS.length];
    const price = new Decimal(19.99 + (seed % 8000) / 100);
    const now = new Date();
    const raw: NormalizedOffer = {
      externalProductId,
      externalOfferId: null,
      title: `Mock ${base}`,
      description: `High-quality ${base.toLowerCase()} offered via ${this.providerId} mock source.`,
      productUrl: `https://example.com/p/${externalProductId}`,
      affiliateUrl: null,
      priceAmount: price,
      originalPriceAmount: null,
      currency: "EUR",
      commissionType: "percentage",
      commissionRate: new Decimal(0.08),
      commissionAmount: null,
      availability: "in_stock",
      sellerName: null,
      shippingCountryCodes: ["DE"],
      averageRating: new Decimal(4.3),
      ratingCount: 120n,
      sourceUpdatedAt: now,
      gtin: null,
      manufacturerPartNumber: null,
      rawReferenceId: externalProductId,
    };
    return normalizeOffer(raw);
  }
}

export function createMockProvider(providerId: AffiliateNetwork): ProductSourcePort {
  return new MockProductSource(providerId);
}
