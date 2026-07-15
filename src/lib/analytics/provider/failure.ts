/**
 * Structured failure taxonomy for the analytics sync engine. Every provider
 * error is normalized into one of these codes so the worker can apply the
 * correct retry policy (see `sync-policy.ts`). Codes are intentionally
 * provider-agnostic — adapters must map platform-specific errors onto them.
 */
export type AnalyticsSyncFailureCode =
  | "AUTHENTICATION_FAILED"
  | "REAUTH_REQUIRED"
  | "ACCOUNT_RESTRICTED"
  | "POST_NOT_FOUND"
  | "RATE_LIMITED"
  | "UNSUPPORTED_METRIC"
  | "INVALID_RESPONSE"
  | "PLATFORM_UNAVAILABLE"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export class AnalyticsSyncError extends Error {
  readonly code: AnalyticsSyncFailureCode;
  readonly retryable: boolean;
  readonly retryAfterMs: number | null;

  constructor(code: AnalyticsSyncFailureCode, message: string, retryAfterMs: number | null = null) {
    super(message);
    this.name = "AnalyticsSyncError";
    this.code = code;
    this.retryable =
      code === "RATE_LIMITED" ||
      code === "NETWORK_ERROR" ||
      code === "PLATFORM_UNAVAILABLE" ||
      code === "INVALID_RESPONSE";
    this.retryAfterMs = retryAfterMs;
  }
}

/** Maps a raw platform error onto our taxonomy. Conservative: unknown errors
 *  are NOT auto-retried endlessly. */
export function classifyProviderError(error: unknown): AnalyticsSyncError {
  if (error instanceof AnalyticsSyncError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes("rate limit") || lower.includes("429")) {
    return new AnalyticsSyncError("RATE_LIMITED", message, 60_000);
  }
  if (lower.includes("unauthorized") || lower.includes("401") || lower.includes("auth")) {
    return new AnalyticsSyncError("AUTHENTICATION_FAILED", message);
  }
  if (lower.includes("reauth") || lower.includes("token expired")) {
    return new AnalyticsSyncError("REAUTH_REQUIRED", message);
  }
  if (lower.includes("not found") || lower.includes("404")) {
    return new AnalyticsSyncError("POST_NOT_FOUND", message);
  }
  if (lower.includes("network") || lower.includes("timeout") || lower.includes("econn")) {
    return new AnalyticsSyncError("NETWORK_ERROR", message, 30_000);
  }
  if (lower.includes("unavailable") || lower.includes("503") || lower.includes("502")) {
    return new AnalyticsSyncError("PLATFORM_UNAVAILABLE", message, 30_000);
  }
  return new AnalyticsSyncError("UNKNOWN_ERROR", message);
}
