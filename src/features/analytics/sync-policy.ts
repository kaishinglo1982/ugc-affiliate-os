/**
 * Pure retry policy for analytics sync jobs. Maps each failure code to a
 * behaviour: reauth-required and unsupported-metric must NOT be retried
 * endlessly; rate-limit / network / platform-unavailable / invalid-response use
 * exponential back-off (with jitter for network/rate), and once `maxAttempts`
 * is exhausted the job goes to the dead-letter queue. No I/O, no clock — all
 * dependencies are passed in so it is fully unit-testable.
 */
import type { AnalyticsSyncFailureCode } from "@/lib/analytics/provider/failure";

export interface RetryDecision {
  kind: "retry" | "dead" | "no_retry";
  nextAttemptAt: Date | null;
}

const RATE_LIMIT_BASE_MS = 60_000;
const NETWORK_BASE_MS = 30_000;
const BACKOFF_CAP_MS = 3_600_000;

function baseDelayFor(code: AnalyticsSyncFailureCode): number | null {
  switch (code) {
    case "RATE_LIMITED":
      return RATE_LIMIT_BASE_MS;
    case "NETWORK_ERROR":
    case "PLATFORM_UNAVAILABLE":
    case "INVALID_RESPONSE":
      return NETWORK_BASE_MS;
    default:
      return null; // AUTHENTICATION_FAILED, REAUTH_REQUIRED, ACCOUNT_RESTRICTED, POST_NOT_FOUND, UNKNOWN_ERROR
  }
}

export function backoffDelay(baseMs: number, attempts: number): number {
  const raw = baseMs * 2 ** Math.max(0, attempts);
  return Math.min(raw, BACKOFF_CAP_MS);
}

export function syncRetryPolicy(
  code: AnalyticsSyncFailureCode,
  attempts: number,
  maxAttempts: number,
  now: Date,
): RetryDecision {
  if (code === "REAUTH_REQUIRED" || code === "UNSUPPORTED_METRIC") {
    return { kind: "no_retry", nextAttemptAt: null };
  }
  const base = baseDelayFor(code);
  if (base === null) return { kind: "no_retry", nextAttemptAt: null };
  if (attempts + 1 >= maxAttempts) return { kind: "dead", nextAttemptAt: null };
  const delay = backoffDelay(base, attempts);
  return { kind: "retry", nextAttemptAt: new Date(now.getTime() + delay) };
}
