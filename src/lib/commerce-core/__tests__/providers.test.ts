import { describe, expect, it } from "vitest";
import {
  ProviderAuthError,
  ProviderError,
  ProviderNetworkError,
  ProviderRateLimitError,
} from "@/lib/commerce-core/providers";
import {
  InMemoryAffiliateProvider,
  InMemorySocialPublisher,
} from "./helpers/test-adapters";

describe("AffiliateProvider contract", () => {
  it("runs the full sync chain and deep link creation", async () => {
    const provider = new InMemoryAffiliateProvider("awin");
    await provider.authenticate();

    const programs = await provider.syncPrograms();
    const products = await provider.syncProducts();
    const link = await provider.createDeepLink({
      tenantId: "tenant-a",
      programId: "program-1",
      destinationUrl: "https://shop.test/p/1",
      affiliateLinkId: "link-1",
    });
    const clicks = await provider.syncClicks();
    const conversions = await provider.syncConversions();
    const commissions = await provider.syncCommissions();
    const payouts = await provider.syncPayouts();

    expect(programs.status).toBe("ok");
    expect(products.cursor).toBe("cursor-1");
    expect(link.deepLinkUrl).toContain("dl.example.test/awin");
    expect(clicks.cursor).toBe("clicks-1");
    expect(conversions.processed).toBe(1);
    expect(commissions.processed).toBe(1);
    expect(payouts.processed).toBe(1);
  });

  it("keeps cursor state across incremental syncs", async () => {
    const provider = new InMemoryAffiliateProvider("awin");
    await provider.authenticate();
    const first = await provider.syncClicks();
    const second = await provider.syncClicks();
    expect(first.cursor).toBe("clicks-1");
    expect(second.cursor).toBe("clicks-2");
    expect(second.processed).toBeGreaterThan(first.processed);
  });

  it("throws ProviderAuthError before authentication", async () => {
    const provider = new InMemoryAffiliateProvider("awin");
    await expect(provider.syncPrograms()).rejects.toThrow(ProviderAuthError);
  });

  it("rejects broken providers at authentication", async () => {
    const provider = new InMemoryAffiliateProvider("broken-provider");
    await expect(provider.authenticate()).rejects.toThrow(ProviderAuthError);
  });
});

describe("SocialPublisher contract", () => {
  it("publishes, reads status and deletes", async () => {
    const publisher = new InMemorySocialPublisher("tiktok");
    await publisher.authenticate();
    const post = await publisher.publish({
      tenantId: "tenant-a",
      socialAccountId: "account-1",
      contentAssetId: "asset-1",
      campaignId: "campaign-1",
      publishKey: "publish-1",
      caption: "Test caption",
      hashtags: ["#test"],
      mediaUrl: "https://cdn.test/video.mp4",
    });
    expect(post.status).toBe("published");
    expect(post.providerPostId).toBe("post-publish-1");

    const status = await publisher.getStatus(post.providerPostId);
    expect(status.publishKey).toBe("publish-1");

    await publisher.delete(post.providerPostId);
    await expect(publisher.getStatus(post.providerPostId)).rejects.toThrow();
  });

  it("supports scheduled publishes with idempotent publish keys", async () => {
    const publisher = new InMemorySocialPublisher("youtube_shorts");
    await publisher.authenticate();
    const scheduled = await publisher.publish({
      tenantId: "tenant-a",
      socialAccountId: "account-1",
      contentAssetId: "asset-1",
      publishKey: "publish-2",
      caption: "Scheduled",
      scheduledAt: new Date("2026-08-02T10:00:00.000Z"),
    });
    expect(scheduled.status).toBe("scheduled");
    expect(scheduled.scheduledAt).toEqual(new Date("2026-08-02T10:00:00.000Z"));

    await expect(
      publisher.publish({
        tenantId: "tenant-a",
        socialAccountId: "account-1",
        contentAssetId: "asset-1",
        publishKey: "publish-2",
        caption: "Duplicate",
      }),
    ).rejects.toThrow("idempotent publish");
  });

  it("requires authentication", async () => {
    const publisher = new InMemorySocialPublisher("instagram");
    await expect(
      publisher.publish({
        tenantId: "tenant-a",
        socialAccountId: "account-1",
        contentAssetId: "asset-1",
        publishKey: "publish-3",
        caption: "x",
      }),
    ).rejects.toThrow(ProviderAuthError);
  });
});

describe("provider error classes", () => {
  it("exposes code and retryable flag", () => {
    const auth = new ProviderAuthError("no credentials");
    expect(auth.code).toBe("AUTHENTICATION_FAILED");
    expect(auth.retryable).toBe(false);

    const network = new ProviderNetworkError("timeout");
    expect(network.code).toBe("NETWORK_ERROR");
    expect(network.retryable).toBe(true);

    const rate = new ProviderRateLimitError("slow down", { limit: 100, remaining: 0, retryAfterMs: 5000 });
    expect(rate.code).toBe("RATE_LIMITED");
    expect(rate.retryable).toBe(true);
    expect(rate.retryAfterMs).toBe(5000);
    expect(rate.remaining).toBe(0);

    const base = new ProviderError("INVALID_RESPONSE", "bad payload");
    expect(base.code).toBe("INVALID_RESPONSE");
    expect(base instanceof Error).toBe(true);
  });
});
