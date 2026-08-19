import { describe, it, expect } from "vitest";
import { getProductSourceProvider, ALL_PROVIDERS } from "./registry";
import { AmazonProductSource } from "./amazon/product-source";
import { MockProductSource } from "./mock-provider";

describe("getProductSourceProvider", () => {
  it("returns the mock provider for every network when called with no options (unchanged default)", () => {
    for (const provider of ALL_PROVIDERS) {
      const port = getProductSourceProvider(provider);
      expect(port).toBeInstanceOf(MockProductSource);
    }
  });

  it("still returns the mock provider for AMAZON_ASSOCIATES when opts.mock is true, even with credentials supplied", () => {
    const port = getProductSourceProvider("AMAZON_ASSOCIATES", {
      mock: true,
      amazon: { credentials: { accessKeyId: "a", secretAccessKey: "b", partnerTag: "c" }, marketplace: "DE" },
    });
    expect(port).toBeInstanceOf(MockProductSource);
  });

  it("still returns the mock provider for AMAZON_ASSOCIATES when no credentials are supplied", () => {
    const port = getProductSourceProvider("AMAZON_ASSOCIATES");
    expect(port).toBeInstanceOf(MockProductSource);
  });

  it("returns the real Amazon adapter only when explicitly given credentials and not mocked", () => {
    const port = getProductSourceProvider("AMAZON_ASSOCIATES", {
      amazon: { credentials: { accessKeyId: "a", secretAccessKey: "b", partnerTag: "c" }, marketplace: "DE" },
    });
    expect(port).toBeInstanceOf(AmazonProductSource);
  });

  it("never returns the real Amazon adapter for a different provider, even with amazon opts set", () => {
    const port = getProductSourceProvider("EBAY_PARTNER_NETWORK", {
      amazon: { credentials: { accessKeyId: "a", secretAccessKey: "b", partnerTag: "c" }, marketplace: "DE" },
    });
    expect(port).toBeInstanceOf(MockProductSource);
  });
});
