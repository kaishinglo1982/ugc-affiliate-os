export type SocialPostStatus =
  | "DRAFT"
  | "READY"
  | "APPROVED"
  | "SCHEDULED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "FAILED"
  | "CANCELLED";

export const TERMINAL_STATUSES: SocialPostStatus[] = ["PUBLISHED", "CANCELLED"];

/**
 * Publishing is never triggered automatically — every post moves DRAFT → READY →
 * APPROVED (the explicit "Freigabe" checkpoint) before it may be scheduled or
 * published. APPROVED/SCHEDULED/FAILED may all go straight to PUBLISHING so a
 * post can be published immediately, scheduled ahead, or retried after an error.
 * Pure and unit-testable; no DB access.
 */
export function isValidPostTransition(from: SocialPostStatus, to: SocialPostStatus): boolean {
  if (from === to) return false;
  if (TERMINAL_STATUSES.includes(from)) return false;

  switch (to) {
    case "CANCELLED":
      return (["DRAFT", "READY", "APPROVED", "SCHEDULED"] as SocialPostStatus[]).includes(from);
    case "READY":
      return from === "DRAFT";
    case "APPROVED":
      return from === "READY";
    case "SCHEDULED":
      return from === "APPROVED";
    case "PUBLISHING":
      return (["APPROVED", "SCHEDULED", "FAILED"] as SocialPostStatus[]).includes(from);
    case "PUBLISHED":
    case "FAILED":
      return from === "PUBLISHING";
    default:
      return false;
  }
}
