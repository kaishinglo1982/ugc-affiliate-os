export type CampaignStatus =
  | "DRAFT"
  | "RESEARCH"
  | "SCRIPTING"
  | "PRODUCTION"
  | "REVIEW"
  | "SCHEDULED"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "ARCHIVED";

export const CAMPAIGN_STATUS_FLOW: CampaignStatus[] = [
  "DRAFT",
  "RESEARCH",
  "SCRIPTING",
  "PRODUCTION",
  "REVIEW",
  "SCHEDULED",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "ARCHIVED",
];

/**
 * Terminal/exception states (PAUSED, ARCHIVED) can be reached from — or
 * return to — most working states; everything else follows the forward
 * pipeline order. Pure and unit-testable; no DB access.
 */
export function isValidCampaignTransition(from: CampaignStatus, to: CampaignStatus): boolean {
  if (from === to) return false;
  if (to === "ARCHIVED") return true;
  if (from === "ARCHIVED") return false;
  if (to === "PAUSED") return from !== "COMPLETED";
  if (from === "PAUSED") return true;

  const fromIndex = CAMPAIGN_STATUS_FLOW.indexOf(from);
  const toIndex = CAMPAIGN_STATUS_FLOW.indexOf(to);
  // Allow moving forward any number of steps, or back exactly one step
  // (correcting an accidental advance).
  return toIndex === fromIndex + 1 || toIndex === fromIndex - 1 || toIndex > fromIndex;
}
