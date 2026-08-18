/**
 * Cost envelope checks (Phase 80.1 consolidation; cost-bracket concept
 * ported from one-user-ugc-affiliate-center ApprovalRequest). Pure logic —
 * money is compared as exact integer cents, never floats.
 */

export type EnvelopeStatus = "ACTIVE" | "CONSUMED" | "EXPIRED" | "CANCELLED";

export interface CostEnvelopeSnapshot {
  currency: string;
  minimum: string; // decimal string, 2 dp
  maximum: string; // decimal string, 2 dp
  status: EnvelopeStatus;
  expiresAt: Date | null;
}

export type EnvelopeDecision =
  | { allowed: true; reason: "OK" }
  | { allowed: false; reason: "MISSING_ENVELOPE" }
  | { allowed: false; reason: "CURRENCY_MISMATCH" }
  | { allowed: false; reason: "ABOVE_MAXIMUM" }
  | { allowed: false; reason: "BELOW_MINIMUM" }
  | { allowed: false; reason: "NOT_ACTIVE" }
  | { allowed: false; reason: "EXPIRED" };

export function centsFromDecimalString(value: string): number {
  const normalized = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`Not a 2-dp decimal string: "${value}"`);
  }
  const [whole, fraction = ""] = normalized.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function centsToDecimalString(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function evaluateCostAgainstEnvelope(input: {
  cost: string; // decimal string, 2 dp
  currency: string;
  envelope: CostEnvelopeSnapshot | null;
  now?: Date;
}): EnvelopeDecision {
  const { envelope } = input;
  if (!envelope) return { allowed: false, reason: "MISSING_ENVELOPE" };
  if (envelope.currency !== input.currency) {
    return { allowed: false, reason: "CURRENCY_MISMATCH" };
  }
  if (envelope.status !== "ACTIVE")
    return { allowed: false, reason: "NOT_ACTIVE" };
  const now = input.now ?? new Date();
  if (envelope.expiresAt && envelope.expiresAt.getTime() < now.getTime()) {
    return { allowed: false, reason: "EXPIRED" };
  }

  const costCents = centsFromDecimalString(input.cost);
  const minCents = centsFromDecimalString(envelope.minimum);
  const maxCents = centsFromDecimalString(envelope.maximum);
  if (costCents > maxCents) return { allowed: false, reason: "ABOVE_MAXIMUM" };
  if (costCents < minCents) return { allowed: false, reason: "BELOW_MINIMUM" };
  return { allowed: true, reason: "OK" };
}
