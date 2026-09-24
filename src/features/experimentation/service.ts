import "server-only";
import { prisma } from "@/lib/db/client";
import { featureFlags } from "@/lib/config/feature-flags";
import { writeAuditLog } from "@/lib/audit/log";
import { incrementMetric, METRICS, logStructured } from "@/lib/observability/metrics";
import { validateExperimentVariants, canTransitionExperiment } from "@/lib/experimentation/status";
import { resolveAssignment, type AssignmentVariant } from "@/lib/experimentation/assignment";
import { analyzeExperiment, ANALYSIS_VERSION, type VariantStat } from "@/lib/experimentation/analysis";
import { Decimal } from "@/lib/shared/decimal";
import type {
  ExperimentType,
  ExperimentMetric,
  ExperimentStatus,
  ApprovalStatus,
  TrafficAllocationMode,
} from "@/generated/prisma/client";

export class ExperimentError extends Error {}

export interface ExperimentVariantInput {
  name: string;
  isControl: boolean;
  trafficWeight: number;
  contentVariantId?: string | null;
}

export interface CreateExperimentInput {
  brandId: string;
  name: string;
  description?: string | null;
  experimentType: ExperimentType;
  primaryMetric: ExperimentMetric;
  secondaryMetrics?: ExperimentMetric[];
  minimumSampleSize: number;
  minimumRuntimeHours: number;
  maximumRuntimeHours: number;
  confidenceThreshold: number;
  practicalSignificanceThreshold: number;
  trafficAllocationMode: TrafficAllocationMode;
  variants: ExperimentVariantInput[];
}

function assertEnabled() {
  if (!featureFlags.analyticsEnabled) throw new ExperimentError("Experimente sind derzeit deaktiviert.");
}

export async function createExperiment(input: CreateExperimentInput, actor: string, workspaceId: string) {
  assertEnabled();
  const validation = validateExperimentVariants(
    input.variants.map((v, i) => ({
      id: `tmp-${i}`,
      isControl: v.isControl,
      trafficWeight: v.trafficWeight,
      status: "DRAFT" as const,
    })),
  );
  if (!validation.valid) {
    throw new ExperimentError(validation.errors.join(" "));
  }

  const brand = await prisma.brand.findFirst({ where: { id: input.brandId, workspaceId }, select: { id: true } });
  if (!brand) throw new ExperimentError("Marke nicht gefunden.");
  for (const variant of input.variants) {
    if (variant.contentVariantId) {
      const contentVariant = await prisma.contentVariant.findFirst({ where: { id: variant.contentVariantId, workspaceId }, select: { id: true } });
      if (!contentVariant) throw new ExperimentError("Content-Variante nicht gefunden.");
    }
  }

  const experiment = await prisma.contentExperiment.create({
    data: {
      workspaceId,
      brandId: input.brandId,
      name: input.name,
      description: input.description ?? null,
      experimentType: input.experimentType,
      status: "DRAFT",
      primaryMetric: input.primaryMetric,
      secondaryMetrics: input.secondaryMetrics ?? [],
      minimumSampleSize: input.minimumSampleSize,
      minimumRuntimeHours: input.minimumRuntimeHours,
      maximumRuntimeHours: input.maximumRuntimeHours,
      confidenceThreshold: new Decimal(input.confidenceThreshold),
      practicalSignificanceThreshold: new Decimal(input.practicalSignificanceThreshold),
      trafficAllocationMode: input.trafficAllocationMode,
      approvalStatus: "DRAFT",
      variants: {
        create: input.variants.map((v) => ({
          name: v.name,
          isControl: v.isControl,
          trafficWeight: v.trafficWeight,
          contentVariantId: v.contentVariantId ?? null,
          status: "DRAFT",
        })),
      },
    },
    include: { variants: true },
  });

  await writeAuditLog({
    action: "experiment.created",
    entityType: "ContentExperiment",
    entityId: experiment.id,
    actor,
    metadata: { variantCount: experiment.variants.length },
  });
  return experiment;
}

async function transition(experimentId: string, to: ExperimentStatus, actor: string, workspaceId: string, extra?: Record<string, unknown>) {
  const exp = await prisma.contentExperiment.findFirst({ where: { id: experimentId, workspaceId } });
  if (!exp) throw new ExperimentError("Experiment nicht gefunden.");
  if (!canTransitionExperiment(exp.status as ExperimentStatus, to)) {
    throw new ExperimentError(`Statuswechsel von ${exp.status} zu ${to} ist nicht erlaubt.`);
  }
  const updated = await prisma.contentExperiment.update({ where: { id: exp.id }, data: { status: to, ...extra } });
  return updated;
}

export async function requestExperimentApproval(experimentId: string, actor: string, workspaceId: string) {
  const updated = await transition(experimentId, "AWAITING_APPROVAL", actor, workspaceId, { approvalStatus: "PENDING" as ApprovalStatus });
  await writeAuditLog({ action: "experiment.approval_requested", entityType: "ContentExperiment", entityId: experimentId, actor });
  return updated;
}

export async function approveExperiment(experimentId: string, actor: string, workspaceId: string) {
  const exp = await prisma.contentExperiment.findFirst({ where: { id: experimentId, workspaceId } });
  if (!exp) throw new ExperimentError("Experiment nicht gefunden.");
  if (exp.status !== "AWAITING_APPROVAL") throw new ExperimentError("Experiment ist nicht zur Freigabe vorliegend.");
  const updated = await prisma.contentExperiment.update({
    where: { id: exp.id },
    data: { approvalStatus: "APPROVED" as ApprovalStatus, status: "SCHEDULED" },
  });
  await writeAuditLog({ action: "experiment.approved", entityType: "ContentExperiment", entityId: experimentId, actor });
  return updated;
}

export async function startExperiment(experimentId: string, actor: string, workspaceId: string) {
  const exp = await prisma.contentExperiment.findFirst({ where: { id: experimentId, workspaceId } });
  if (!exp) throw new ExperimentError("Experiment nicht gefunden.");
  if (exp.approvalStatus !== "APPROVED") throw new ExperimentError("Experiment benötigt Freigabe vor dem Start.");
  const updated = await transition(experimentId, "RUNNING", actor, workspaceId, { startedAt: new Date() });
  incrementMetric(METRICS.experimentStartedTotal);
  await writeAuditLog({ action: "experiment.started", entityType: "ContentExperiment", entityId: experimentId, actor });
  return updated;
}

export async function pauseExperiment(experimentId: string, actor: string, workspaceId: string) {
  const updated = await transition(experimentId, "PAUSED", actor, workspaceId);
  await writeAuditLog({ action: "experiment.paused", entityType: "ContentExperiment", entityId: experimentId, actor });
  return updated;
}

export async function completeExperiment(experimentId: string, actor: string, workspaceId: string, inconclusive = false) {
  const extra: Record<string, unknown> = { endedAt: new Date() };
  const updated = await transition(experimentId, inconclusive ? "INCONCLUSIVE" : "COMPLETED", actor, workspaceId, extra);
  incrementMetric(inconclusive ? METRICS.experimentInconclusiveTotal : METRICS.experimentCompletedTotal);
  await writeAuditLog({
    action: inconclusive ? "experiment.inconclusive" : "experiment.completed",
    entityType: "ContentExperiment",
    entityId: experimentId,
    actor,
  });
  return updated;
}

/** Deterministically (re)creates assignments for a set of publishing jobs. */
export async function assignExperimentJobs(experimentId: string, jobIds: string[], workspaceId: string) {
  const exp = await prisma.contentExperiment.findFirst({
    where: { id: experimentId, workspaceId },
    include: { variants: { select: { id: true, isControl: true, trafficWeight: true } } },
  });
  if (!exp) throw new ExperimentError("Experiment nicht gefunden.");
  const variants: AssignmentVariant[] = exp.variants.map((v) => ({ id: v.id, isControl: v.isControl, trafficWeight: v.trafficWeight }));

  const assignments = jobIds.map((jobId) => {
    const { assignmentKey, variantId } = resolveAssignment({
      experimentId,
      assignmentType: "PUBLISHING_JOB",
      assignmentReferenceId: jobId,
      variants,
    });
    return { experimentId, experimentVariantId: variantId, assignmentKey, assignmentType: "PUBLISHING_JOB" as const, assignmentReferenceId: jobId };
  });

  // Idempotent: upsert by unique (experimentId, assignmentKey).
  for (const a of assignments) {
    await prisma.experimentAssignment.upsert({
      where: { workspaceId_experimentId_assignmentKey: { workspaceId, experimentId: a.experimentId, assignmentKey: a.assignmentKey } },
      create: { ...a, workspaceId },
      update: { experimentVariantId: a.experimentVariantId, assignmentReferenceId: a.assignmentReferenceId },
    });
  }
  return assignments.length;
}

/** Aggregates variant stats from content performance snapshots and runs the
 *  conservative analysis engine. Persists an ExperimentResult. Never auto-applies
 *  a winner to live configuration. */
export async function analyzeExperimentById(experimentId: string, workspaceId: string) {
  const exp = await prisma.contentExperiment.findFirst({
    where: { id: experimentId, workspaceId },
    include: { variants: { select: { id: true, isControl: true, contentVariantId: true } } },
  });
  if (!exp) throw new ExperimentError("Experiment nicht gefunden.");

  const variants: VariantStat[] = [];
  for (const v of exp.variants) {
    const snapshot = v.contentVariantId
      ? await prisma.contentPerformanceSnapshot.aggregate({
          where: { workspaceId, contentVariantId: v.contentVariantId },
          _sum: { impressions: true, linkClicks: true, conversions: true, views: true },
          _count: { _all: true },
        })
      : null;
    const impressions = BigInt(snapshot?._sum.impressions?.toString() ?? "0");
    const linkClicks = BigInt(snapshot?._sum.linkClicks?.toString() ?? "0");
    const conversions = BigInt(snapshot?._sum.conversions?.toString() ?? "0");
    const views = BigInt(snapshot?._sum.views?.toString() ?? "0");
    const sampleSize = BigInt(snapshot?._count._all ?? 0);
    const primaryValue =
      exp.primaryMetric === "CONVERSION_RATE"
        ? linkClicks > 0n
          ? new Decimal(conversions.toString()).div(linkClicks.toString())
          : null
        : exp.primaryMetric === "CLICK_THROUGH_RATE"
          ? impressions > 0n
            ? new Decimal(linkClicks.toString()).div(impressions.toString())
            : null
          : exp.primaryMetric === "ENGAGEMENT_RATE"
            ? impressions > 0n
              ? new Decimal(views.toString()).div(impressions.toString())
              : null
            : null;

    variants.push({
      variantId: v.id,
      isControl: v.isControl,
      value: primaryValue?.toString() ?? null,
      sampleSize,
      denominator:
        exp.primaryMetric === "CONVERSION_RATE"
          ? linkClicks
          : exp.primaryMetric === "CLICK_THROUGH_RATE"
            ? impressions
            : exp.primaryMetric === "ENGAGEMENT_RATE"
              ? impressions
              : null,
    });
  }

  const outcome = analyzeExperiment({
    experimentId,
    primaryMetric: exp.primaryMetric,
    minimumSampleSize: exp.minimumSampleSize,
    confidenceThreshold: exp.confidenceThreshold.toString(),
    practicalSignificanceThreshold: exp.practicalSignificanceThreshold.toString(),
    variants,
  });

  const result = await prisma.experimentResult.create({
    data: {
      workspaceId,
      experimentId,
      analyzedAt: new Date(),
      status: outcome.status,
      winningVariantId: outcome.winningVariantId,
      primaryMetric: exp.primaryMetric,
      controlValue: outcome.controlValue?.toString() ?? null,
      winningValue: outcome.winningValue?.toString() ?? null,
      relativeLift: outcome.relativeLift?.toString() ?? null,
      absoluteLift: outcome.absoluteLift?.toString() ?? null,
      sampleSize: outcome.sampleSize,
      confidenceScore: outcome.confidenceScore,
      practicalSignificanceReached: outcome.practicalSignificanceReached,
      analysisMethod: outcome.analysisMethod,
      analysisVersion: ANALYSIS_VERSION,
      explanation: outcome.explanation,
    },
  });

  await writeAuditLog({
    action: outcome.winningVariantId ? "experiment.winner_detected" : "experiment.analysis_completed",
    entityType: "ExperimentResult",
    entityId: result.id,
    metadata: { status: outcome.status, winningVariantId: outcome.winningVariantId },
  });
  logStructured({ experimentId, status: outcome.status, message: "experiment analyzed" });
  return result;
}
