/**
 * Pure retry/back-off/dead-letter policy for the publish queue. No DB, no
 * clock, no I/O — every function takes its dependencies explicitly so it can
 * be unit-tested deterministically. The worker (infrastructure layer) is the
 * only place that calls these; domain logic stays portable and side-effect free.
 */

export const PUBLISH_MAX_ATTEMPTS = 5;
export const PUBLISH_BACKOFF_BASE_MS = 30_000;
export const PUBLISH_BACKOFF_CAP_MS = 3_600_000;

export type PublishJobOutcome = "succeeded" | "retryable" | "dead";

/** Exponential back-off: 30s, 60s, 120s, 240s, 480s … capped at one hour. */
export function backoffMs(attempt: number): number {
  if (attempt <= 0) return PUBLISH_BACKOFF_BASE_MS;
  const raw = PUBLISH_BACKOFF_BASE_MS * 2 ** (attempt - 1);
  return Math.min(raw, PUBLISH_BACKOFF_CAP_MS);
}

/** A job is dead-lettered once it has exhausted every allowed attempt. */
export function isDeadLetter(attempts: number): boolean {
  return attempts >= PUBLISH_MAX_ATTEMPTS;
}

/** Absolute timestamp for the next retry given the attempt count just used. */
export function nextRetryAt(attempt: number, now: Date): Date {
  return new Date(now.getTime() + backoffMs(attempt));
}

/**
 * Classifies the result of one publish attempt. `attempt` is the value BEFORE
 * this attempt was counted, so the first attempt is attempt = 0.
 */
export function classifyAttempt(success: boolean, attempt: number): PublishJobOutcome {
  if (success) return "succeeded";
  return isDeadLetter(attempt + 1) ? "dead" : "retryable";
}
