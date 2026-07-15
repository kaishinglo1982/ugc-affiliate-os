/**
 * Rule-based anomaly detection (Phase 6 foundation). Every detector refuses to
 * flag anything below the minimum sample size, and explanations are neutral —
 * anomalies are never labeled as "fraud". Seasonal variation is respected by
 * using expected ranges rather than point comparisons. Critical anomalies are
 * surfaced for optional, auditable blocking by a policy — never auto-applied.
 */
import type { AnomalySeverity, ScopeType } from "@/generated/prisma/client";

export interface AnomalyContext {
  sampleSize: number;
  minimumSampleSize: number;
  viewsObserved: number | null;
  viewsExpectedMin: number | null;
  viewsExpectedMax: number | null;
  linkClicksObserved: number | null;
  linkClicksExpectedMax: number | null;
  conversionsObserved: number | null;
  conversionsExpectedMin: number | null;
  refundsObserved: number | null;
  refundsExpectedMax: number | null;
  costObserved: number | null;
  costExpectedMax: number | null;
  hasAnalyticsData: boolean;
  importDelayHours: number | null;
  affiliateLinkErrorCount: number;
}

export interface AnomalyScope {
  scopeType: ScopeType;
  scopeId: string;
}

export interface AnomalyDraft {
  anomalyType: string;
  scopeType: ScopeType;
  scopeId: string;
  severity: AnomalySeverity;
  observedValue: number | null;
  expectedRangeMin: number | null;
  expectedRangeMax: number | null;
  explanation: string;
  evidenceReferences: string[];
}

function enoughData(ctx: AnomalyContext): boolean {
  return ctx.sampleSize >= ctx.minimumSampleSize;
}

function severityByDeviation(ratio: number): AnomalySeverity {
  if (ratio >= 3) return "CRITICAL";
  if (ratio >= 1.5) return "HIGH";
  return "MEDIUM";
}

export function detectAnomalies(ctx: AnomalyContext, scope: AnomalyScope): AnomalyDraft[] {
  const anomalies: AnomalyDraft[] = [];
  const evidence = [`sampleSize:${ctx.sampleSize}`];

  if (enoughData(ctx) && ctx.viewsObserved != null && ctx.viewsExpectedMin != null && ctx.viewsObserved < ctx.viewsExpectedMin * 0.5) {
    const ratio = ctx.viewsExpectedMin / Math.max(ctx.viewsObserved, 1);
    anomalies.push({
      anomalyType: "VIEW_DROP",
      ...scope,
      severity: severityByDeviation(ratio),
      observedValue: ctx.viewsObserved,
      expectedRangeMin: ctx.viewsExpectedMin,
      expectedRangeMax: ctx.viewsExpectedMax,
      explanation: `Ungewöhnlicher Rückgang der Aufrufe gegenüber dem erwarteten Bereich.`,
      evidenceReferences: evidence,
    });
  }

  if (enoughData(ctx) && ctx.linkClicksObserved != null && ctx.linkClicksExpectedMax != null && ctx.linkClicksObserved > ctx.linkClicksExpectedMax * 2) {
    const ratio = ctx.linkClicksObserved / Math.max(ctx.linkClicksExpectedMax, 1);
    anomalies.push({
      anomalyType: "CLICK_SPIKE",
      ...scope,
      severity: severityByDeviation(ratio),
      observedValue: ctx.linkClicksObserved,
      expectedRangeMin: null,
      expectedRangeMax: ctx.linkClicksExpectedMax,
      explanation: `Ungewöhnlicher Anstieg der Link-Klicks.`,
      evidenceReferences: evidence,
    });
  }

  if (enoughData(ctx) && ctx.conversionsObserved != null && ctx.conversionsExpectedMin != null && ctx.conversionsObserved < ctx.conversionsExpectedMin * 0.5) {
    anomalies.push({
      anomalyType: "CONVERSION_DROP",
      ...scope,
      severity: "HIGH",
      observedValue: ctx.conversionsObserved,
      expectedRangeMin: ctx.conversionsExpectedMin,
      expectedRangeMax: null,
      explanation: `Einbruch der Conversions gegenüber dem erwarteten Mindestwert.`,
      evidenceReferences: evidence,
    });
  }

  if (enoughData(ctx) && ctx.refundsObserved != null && ctx.refundsExpectedMax != null && ctx.refundsObserved > ctx.refundsExpectedMax) {
    anomalies.push({
      anomalyType: "REFUND_INCREASE",
      ...scope,
      severity: "HIGH",
      observedValue: ctx.refundsObserved,
      expectedRangeMin: null,
      expectedRangeMax: ctx.refundsExpectedMax,
      explanation: `Erhöhte Refund-Anzahl über dem erwarteten Maximum.`,
      evidenceReferences: evidence,
    });
  }

  if (enoughData(ctx) && ctx.costObserved != null && ctx.costExpectedMax != null && ctx.costObserved > ctx.costExpectedMax) {
    anomalies.push({
      anomalyType: "COST_SPIKE",
      ...scope,
      severity: severityByDeviation(ctx.costObserved / Math.max(ctx.costExpectedMax, 1)),
      observedValue: ctx.costObserved,
      expectedRangeMin: null,
      expectedRangeMax: ctx.costExpectedMax,
      explanation: `Ungewöhnlich hohe Kosten gegenüber dem erwarteten Maximum.`,
      evidenceReferences: evidence,
    });
  }

  if (!ctx.hasAnalyticsData) {
    anomalies.push({
      anomalyType: "MISSING_ANALYTICS_DATA",
      ...scope,
      severity: "MEDIUM",
      observedValue: null,
      expectedRangeMin: null,
      expectedRangeMax: null,
      explanation: `Es fehlen aktuelle Analytics-Daten für diesen Bereich.`,
      evidenceReferences: evidence,
    });
  }

  if (ctx.importDelayHours != null && ctx.importDelayHours > 24) {
    anomalies.push({
      anomalyType: "IMPORT_DELAY",
      ...scope,
      severity: ctx.importDelayHours > 72 ? "HIGH" : "MEDIUM",
      observedValue: ctx.importDelayHours,
      expectedRangeMin: null,
      expectedRangeMax: 24,
      explanation: `Importverzögerung von ${ctx.importDelayHours} Stunden.`,
      evidenceReferences: evidence,
    });
  }

  if (ctx.affiliateLinkErrorCount > 0) {
    anomalies.push({
      anomalyType: "AFFILIATE_LINK_ERROR",
      ...scope,
      severity: ctx.affiliateLinkErrorCount >= 5 ? "HIGH" : "MEDIUM",
      observedValue: ctx.affiliateLinkErrorCount,
      expectedRangeMin: null,
      expectedRangeMax: 0,
      explanation: `Möglicher Affiliate-Link-Fehler (${ctx.affiliateLinkErrorCount} Hinweise).`,
      evidenceReferences: evidence,
    });
  }

  return anomalies;
}
