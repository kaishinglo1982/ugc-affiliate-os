/**
 * In-memory test adapters for the provider-neutral contracts. Test-only —
 * never imported from production code.
 */
import {
  ProviderAuthError,
  type AffiliateProvider,
  type DeepLink,
  type DeepLinkInput,
  type PublishedPost,
  type PublishInput,
  type SocialPublisher,
  type SyncResult,
} from "@/lib/commerce-core/providers";

export class InMemoryAffiliateProvider implements AffiliateProvider {
  readonly name: string;
  private authenticated = false;
  private clicksSynced = 0;
  private deepLinks: DeepLink[] = [];

  constructor(name = "test-provider") {
    this.name = name;
  }

  async authenticate(): Promise<void> {
    if (this.name === "broken-provider") {
      throw new ProviderAuthError("broken provider rejects authentication");
    }
    this.authenticated = true;
  }

  private requireAuth(): void {
    if (!this.authenticated) {
      throw new ProviderAuthError("not authenticated");
    }
  }

  async syncPrograms(): Promise<SyncResult> {
    this.requireAuth();
    return result(this.name, "ok", 2, 0, null);
  }

  async syncProducts(): Promise<SyncResult> {
    this.requireAuth();
    return result(this.name, "ok", 1, 0, "cursor-1");
  }

  async createDeepLink(input: DeepLinkInput): Promise<DeepLink> {
    this.requireAuth();
    const deepLink: DeepLink = {
      deepLinkUrl: `https://dl.example.test/${this.name}/${input.affiliateLinkId ?? "link"}`,
      provider: this.name,
      externalReferenceId: `dl-${this.deepLinks.length + 1}`,
      createdAt: new Date("2026-08-01T12:00:00.000Z"),
    };
    this.deepLinks.push(deepLink);
    return deepLink;
  }

  async syncClicks(): Promise<SyncResult> {
    this.requireAuth();
    this.clicksSynced += 1;
    return result(this.name, "ok", this.clicksSynced, 0, `clicks-${this.clicksSynced}`);
  }

  async syncConversions(): Promise<SyncResult> {
    this.requireAuth();
    return result(this.name, "ok", 1, 0, null);
  }

  async syncCommissions(): Promise<SyncResult> {
    this.requireAuth();
    return result(this.name, "ok", 1, 0, null);
  }

  async syncPayouts(): Promise<SyncResult> {
    this.requireAuth();
    return result(this.name, "ok", 1, 0, null);
  }
}

export class InMemorySocialPublisher implements SocialPublisher {
  readonly platform: string;
  private authenticated = false;
  private posts = new Map<string, PublishedPost>();
  private publishedKeys = new Set<string>();

  constructor(platform = "tiktok") {
    this.platform = platform;
  }

  async authenticate(): Promise<void> {
    this.authenticated = true;
  }

  async publish(input: PublishInput): Promise<PublishedPost> {
    if (!this.authenticated) {
      throw new ProviderAuthError("not authenticated");
    }
    if (this.publishedKeys.has(input.publishKey)) {
      throw new Error(`idempotent publish: key ${input.publishKey} already published`);
    }
    this.publishedKeys.add(input.publishKey);
    const post: PublishedPost = {
      providerPostId: `post-${input.publishKey}`,
      status: input.scheduledAt ? "scheduled" : "published",
      publishKey: input.publishKey,
      url: `https://tiktok.test/@${input.socialAccountId}/${input.publishKey}`,
      publishedAt: input.scheduledAt ? undefined : new Date("2026-08-01T12:00:00.000Z"),
      scheduledAt: input.scheduledAt ?? undefined,
      error: null,
    };
    this.posts.set(post.providerPostId, post);
    return post;
  }

  async getStatus(providerPostId: string): Promise<PublishedPost> {
    const post = this.posts.get(providerPostId);
    if (!post) throw new Error(`unknown provider post id ${providerPostId}`);
    return post;
  }

  async delete(providerPostId: string): Promise<void> {
    if (!this.posts.delete(providerPostId)) {
      throw new Error(`unknown provider post id ${providerPostId}`);
    }
  }
}

function result(
  provider: string,
  status: "ok" | "partial" | "failed",
  processed: number,
  failed: number,
  cursor: string | null,
): SyncResult {
  return { provider, status, processed, failed, cursor, syncedAt: new Date("2026-08-01T12:00:00.000Z") };
}
