/**
 * Provider-neutral contracts for affiliate networks, deep links and social
 * publishing.
 *
 * No provider-specific types leak past a concrete adapter: adapters implement
 * these interfaces, the core only ever sees the interface. Real adapters are
 * NOT included — in-memory adapters for tests live in
 * `src/lib/commerce-core/__tests__/fixtures/`.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type ProviderErrorCode =
  | "AUTHENTICATION_FAILED"
  | "REAUTH_REQUIRED"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_RESPONSE"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "UNKNOWN_ERROR";

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly retryable: boolean;

  constructor(code: ProviderErrorCode, message: string, retryable = false) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.retryable = retryable;
  }
}

export class ProviderAuthError extends ProviderError {
  constructor(message: string) {
    super("AUTHENTICATION_FAILED", message, false);
    this.name = "ProviderAuthError";
  }
}

export class ProviderRateLimitError extends ProviderError {
  readonly retryAfterMs: number | null;
  readonly limit: number | null;
  readonly remaining: number | null;

  constructor(message: string, meta: RateLimitMeta = {}) {
    super("RATE_LIMITED", message, true);
    this.name = "ProviderRateLimitError";
    this.retryAfterMs = meta.retryAfterMs ?? null;
    this.limit = meta.limit ?? null;
    this.remaining = meta.remaining ?? null;
  }
}

export class ProviderNetworkError extends ProviderError {
  constructor(message: string) {
    super("NETWORK_ERROR", message, true);
    this.name = "ProviderNetworkError";
  }
}

// ---------------------------------------------------------------------------
// Shared sync primitives
// ---------------------------------------------------------------------------

export interface RateLimitMeta {
  limit?: number;
  remaining?: number;
  resetAt?: Date;
  retryAfterMs?: number;
}

export type SyncStatus = "ok" | "partial" | "failed";

export const syncStatusSchema = z.enum(["ok", "partial", "failed"]);

export interface SyncResult {
  provider: string;
  status: SyncStatus;
  processed: number;
  failed: number;
  /** Opaque provider cursor for incremental syncs (null = full sync). */
  cursor: string | null;
  error?: string;
  rateLimit?: RateLimitMeta;
  syncedAt: Date;
}

/** Persistable cursor state per tenant + provider + kind. */
export interface ProviderSyncState {
  tenantId: string;
  provider: string;
  kind: "programs" | "products" | "clicks" | "conversions" | "commissions" | "payouts";
  cursor: string | null;
  lastSyncAt: Date | null;
  lastError: string | null;
}

// ---------------------------------------------------------------------------
// Affiliate provider
// ---------------------------------------------------------------------------

export interface DeepLinkInput {
  tenantId: string;
  programId: string;
  destinationUrl: string;
  campaignId?: string | null;
  productId?: string | null;
  affiliateLinkId?: string | null;
}

export interface DeepLink {
  deepLinkUrl: string;
  provider: string;
  externalReferenceId?: string | null;
  createdAt: Date;
}

/**
 * Neutral affiliate-network contract covering deep links and the full sync
 * chain (programs → products → clicks → conversions → commissions → payouts).
 * Cursor-based syncs are idempotent: providers MUST deduplicate by external
 * id, the core deduplicates again per tenant + provider + external id.
 */
export interface AffiliateProvider {
  readonly name: string;
  authenticate(): Promise<void>;
  syncPrograms(): Promise<SyncResult>;
  syncProducts(): Promise<SyncResult>;
  createDeepLink(input: DeepLinkInput): Promise<DeepLink>;
  syncClicks(): Promise<SyncResult>;
  syncConversions(): Promise<SyncResult>;
  syncCommissions(): Promise<SyncResult>;
  syncPayouts(): Promise<SyncResult>;
}

// ---------------------------------------------------------------------------
// Social publisher
// ---------------------------------------------------------------------------

export interface PublishInput {
  tenantId: string;
  socialAccountId: string;
  contentAssetId: string;
  campaignId?: string | null;
  /** Published post id from the core (idempotent publish key). */
  publishKey: string;
  caption: string;
  hashtags?: string[];
  mediaUrl?: string | null;
  scheduledAt?: Date | null;
}

export type PublishedPostStatus = "published" | "scheduled" | "failed";

export interface PublishedPost {
  providerPostId: string;
  status: PublishedPostStatus;
  publishKey: string;
  url?: string | null;
  publishedAt?: Date | null;
  scheduledAt?: Date | null;
  error?: string | null;
}

/**
 * Neutral social publishing contract. Publish is idempotent via
 * `publishKey`: adapters must reject a repeated publish of the same key
 * instead of double-posting. No real API call is made without credentials —
 * adapters without credentials must throw `ProviderAuthError`.
 */
export interface SocialPublisher {
  readonly platform: string;
  authenticate(): Promise<void>;
  publish(input: PublishInput): Promise<PublishedPost>;
  getStatus(providerPostId: string): Promise<PublishedPost>;
  delete(providerPostId: string): Promise<void>;
}
