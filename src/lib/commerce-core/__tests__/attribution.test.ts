import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOOKBACK_HOURS,
  markConversionStatus,
  resolveAttribution,
} from "@/lib/commerce-core/attribution";
import type { ConversionEvent, TrackingTouch } from "@/lib/commerce-core/types";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const LINK_A = "link-a";
const LINK_B = "link-b";

const NOW = new Date("2026-08-01T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;

function touch(partial: Partial<TrackingTouch> & Pick<TrackingTouch, "affiliateLinkId" | "touchId">): TrackingTouch {
  return {
    tenantId: TENANT_A,
    occurredAt: NOW,
    campaignId: null,
    productId: null,
    characterId: null,
    socialAccountId: null,
    contentAssetId: null,
    publishedPostId: null,
    clickId: null,
    provider: null,
    ...partial,
  };
}

function conversion(partial: Partial<ConversionEvent>): ConversionEvent {
  return {
    conversionId: "conv-1",
    tenantId: TENANT_A,
    provider: "awin",
    providerConversionId: "ext-1",
    affiliateLinkId: LINK_A,
    clickId: null,
    occurredAt: NOW,
    grossRevenue: 100,
    commission: 8,
    currency: "EUR",
    status: "confirmed",
    ...partial,
  };
}

describe("resolveAttribution (last touch)", () => {
  it("attributes the newest touch within the lookback window via click id", () => {
    const touches = [
      touch({ touchId: "t1", affiliateLinkId: LINK_A, clickId: "c1", occurredAt: new Date(NOW.getTime() - 2 * HOUR) }),
      touch({ touchId: "t2", affiliateLinkId: LINK_A, clickId: "c1", occurredAt: new Date(NOW.getTime() - 1 * HOUR) }),
    ];
    const result = resolveAttribution(
      touches,
      [conversion({ clickId: "c1" })],
      {},
      { now: NOW },
    );
    expect(result.conversions[0].attributed).toBe(true);
    expect(result.conversions[0].touch?.touchId).toBe("t2");
    expect(result.conversions[0].reason).toBe("click_match");
    expect(result.summary.attributed).toBe(1);
  });

  it("attributes multiple touchpoints per link and picks the last one", () => {
    const touches = [
      touch({ touchId: "t1", affiliateLinkId: LINK_A, clickId: "c1", occurredAt: new Date(NOW.getTime() - 5 * HOUR) }),
      touch({ touchId: "t2", affiliateLinkId: LINK_A, clickId: "c2", occurredAt: new Date(NOW.getTime() - 1 * HOUR) }),
    ];
    const result = resolveAttribution(touches, [conversion({ clickId: "c2" })], {}, { now: NOW });
    expect(result.conversions[0].touch?.touchId).toBe("t2");
    expect(result.conversions[0].reason).toBe("click_match");
  });

  it("rejects cross-tenant attribution", () => {
    const touches = [
      touch({ touchId: "t-other", tenantId: TENANT_B, affiliateLinkId: LINK_A, clickId: "c1" }),
    ];
    const result = resolveAttribution(touches, [conversion({ clickId: "c1" })], {}, { now: NOW });
    expect(result.conversions[0].attributed).toBe(false);
    expect(result.conversions[0].reason).toBe("cross_tenant");
    expect(result.summary.crossTenantRejected).toBe(1);
    expect(result.summary.attributed).toBe(0);
  });

  it("ignores touches outside the lookback window", () => {
    const touches = [
      touch({
        touchId: "t-old",
        affiliateLinkId: LINK_A,
        clickId: "c1",
        occurredAt: new Date(NOW.getTime() - (DEFAULT_LOOKBACK_HOURS + 1) * HOUR),
      }),
    ];
    const result = resolveAttribution(touches, [conversion({ clickId: "c1" })], {}, { now: NOW });
    expect(result.conversions[0].attributed).toBe(false);
    expect(result.conversions[0].reason).toBe("outside_lookback");
    expect(result.summary.outsideLookback).toBe(1);
  });

  it("supports custom lookback windows", () => {
    const touches = [
      touch({ touchId: "t1", affiliateLinkId: LINK_A, clickId: "c1", occurredAt: new Date(NOW.getTime() - 2 * HOUR) }),
    ];
    const result = resolveAttribution(
      touches,
      [conversion({ clickId: "c1" })],
      { lookbackHours: 1 },
      { now: NOW },
    );
    expect(result.conversions[0].reason).toBe("outside_lookback");
  });

  it("rejects unknown click ids without link fallback", () => {
    const touches = [touch({ touchId: "t1", affiliateLinkId: LINK_A, clickId: "c1" })];
    const result = resolveAttribution(touches, [conversion({ clickId: "c-unknown" })], {}, { now: NOW });
    expect(result.conversions[0].attributed).toBe(false);
    expect(result.conversions[0].reason).toBe("unknown_click");
  });

  it("falls back to the affiliate link only when explicitly allowed", () => {
    const touches = [touch({ touchId: "t1", affiliateLinkId: LINK_A, clickId: "c1" })];
    const denied = resolveAttribution(touches, [conversion({ clickId: null })], {}, { now: NOW });
    expect(denied.conversions[0].reason).toBe("unknown_click");

    const allowed = resolveAttribution(
      touches,
      [conversion({ clickId: null })],
      { allowLinkFallback: true },
      { now: NOW },
    );
    expect(allowed.conversions[0].attributed).toBe(true);
    expect(allowed.conversions[0].reason).toBe("link_fallback");
    expect(allowed.conversions[0].touch?.touchId).toBe("t1");
  });

  it("deduplicates conversions per tenant + provider + provider conversion id", () => {
    const touches = [touch({ touchId: "t1", affiliateLinkId: LINK_A, clickId: "c1" })];
    const dup = conversion({ clickId: "c1" });
    const result = resolveAttribution(touches, [dup, { ...dup, conversionId: "conv-dup" }], {}, { now: NOW });
    expect(result.summary.total).toBe(2);
    expect(result.summary.attributed).toBe(1);
    expect(result.summary.duplicate).toBe(1);
    expect(result.conversions[1].reason).toBe("duplicate");
  });

  it("never attributes reversed conversions", () => {
    const touches = [touch({ touchId: "t1", affiliateLinkId: LINK_A, clickId: "c1" })];
    const result = resolveAttribution(
      touches,
      [conversion({ status: "reversed", clickId: "c1" })],
      {},
      { now: NOW },
    );
    expect(result.conversions[0].attributed).toBe(false);
    expect(result.conversions[0].reason).toBe("reversed");
    expect(result.summary.reversed).toBe(1);
    expect(result.summary.attributed).toBe(0);
  });

  it("normalizes currency only when a rate for the source currency exists", () => {
    const touches = [touch({ touchId: "t1", affiliateLinkId: LINK_A, clickId: "c1" })];
    const rates = { USD: 0.92 };
    const result = resolveAttribution(
      touches,
      [conversion({ clickId: "c1", currency: "USD", commission: 10 })],
      { currencyCode: "EUR" },
      { currencyRates: rates, now: NOW },
    );
    expect(result.conversions[0].currency).toBe("EUR");
    expect(result.conversions[0].conversion.commission).toBe(9.2);

    const noRate = resolveAttribution(
      touches,
      [conversion({ clickId: "c1", currency: "JPY", commission: 10 })],
      { currencyCode: "EUR" },
      { currencyRates: rates, now: NOW },
    );
    expect(noRate.conversions[0].currency).toBe("JPY");
    expect(noRate.conversions[0].conversion.commission).toBe(10);
  });

  it("keeps pending conversions attributable but reported separately", () => {
    const touches = [touch({ touchId: "t1", affiliateLinkId: LINK_A, clickId: "c1" })];
    const result = resolveAttribution(touches, [conversion({ status: "pending", clickId: "c1" })], {}, { now: NOW });
    expect(result.conversions[0].attributed).toBe(true);
    expect(result.summary.attributed).toBe(1);
    expect(result.summary.pending).toBe(1);
    expect(result.summary.confirmed).toBe(0);
  });
});

describe("markConversionStatus", () => {
  it("moves pending to confirmed", () => {
    const conversions = [conversion({ status: "pending" })];
    const next = markConversionStatus(conversions, "conv-1", "confirmed");
    expect(next[0].status).toBe("confirmed");
  });

  it("moves confirmed to reversed", () => {
    const conversions = [conversion({ status: "confirmed" })];
    const next = markConversionStatus(conversions, "conv-1", "reversed");
    expect(next[0].status).toBe("reversed");
  });

  it("is idempotent for the same target status", () => {
    const conversions = [conversion({ status: "confirmed" })];
    const next = markConversionStatus(conversions, "conv-1", "confirmed");
    expect(next).toBe(conversions);
  });

  it("never revives a reversed conversion", () => {
    const conversions = [conversion({ status: "reversed" })];
    const next = markConversionStatus(conversions, "conv-1", "confirmed");
    expect(next).toBe(conversions);
    expect(next[0].status).toBe("reversed");
  });

  it("ignores unknown conversion ids", () => {
    const conversions = [conversion({ status: "pending" })];
    const next = markConversionStatus(conversions, "unknown", "confirmed");
    expect(next).toBe(conversions);
  });
});
