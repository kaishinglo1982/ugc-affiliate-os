/**
 * In-process sliding-window rate limiter for the single-user login endpoint.
 * Sufficient for a single-instance deployment; state resets on process restart
 * and is not shared across instances (documented in docs/security-review.md).
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const attempts = new Map<string, number[]>();

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const history = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  attempts.set(key, history);
  return history.length >= MAX_ATTEMPTS;
}

export function recordAttempt(key: string): void {
  const now = Date.now();
  const history = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  history.push(now);
  attempts.set(key, history);
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}
