/**
 * Phase 7 — research job orchestrator.
 *
 * Runs the discovery → enrichment → scoring pipeline as ordered, independently
 * fault-isolated steps. Each step is recorded as a `ProductResearchJob` row and
 * failures are captured without aborting the remaining steps. Products are
 * NEVER auto-approved (the auto-approval flag is false by design).
 */
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { Prisma } from "@/generated/prisma/client";
import { DEFAULT_WORKSPACE_ID } from "@/lib/config/workspace";
import { featureFlags } from "@/lib/config/feature-flags";
import { writeAuditLog } from "@/lib/audit/log";
import { METRICS, incrementMetric, logStructured } from "@/lib/observability/metrics";
import {
  STEP_NAMES,
  STEP_JOB_TYPE,
  type StepName,
} from "@/features/products/application/steps";
import { RESEARCH_JOB_TYPE_TO_PRISMA } from "@/features/products/domain/types";
import {
  runDiscoveryForQuery,
  recomputeMatchesForPendingOffers,
  evaluateComplianceForProduct,
  analyzeContentFitForProduct,
  estimateProfitabilityForOffer,
  scoreProductOpportunities,
  expireOpportunities,
  scanDataQualityForProduct,
  refreshOffers,
} from "@/features/products/application/core";

export { STEP_NAMES, STEP_JOB_TYPE };
export type { StepName };

interface StepResult {
  name: string;
  status: string;
  error?: string;
}

const statusFilter = ["DISCOVERED", "UNDER_REVIEW"] as const;

async function runStep(
  name: StepName,
  correlationId: string,
  actor: string,
  workspaceId: string,
  fn: () => Promise<unknown>,
): Promise<StepResult> {
  const jobId = randomUUID();
  const jobType = RESEARCH_JOB_TYPE_TO_PRISMA[STEP_JOB_TYPE[name]];
  const idempotencyKey = `${correlationId}:${name}`;
  await prisma.productResearchJob.create({
    data: {
      id: jobId,
      workspaceId,
      jobType,
      status: "RUNNING",
      correlationId,
      idempotencyKey,
      startedAt: new Date(),
    },
  });

  try {
    await fn();
    await prisma.productResearchJob.update({
      where: { id: jobId, workspaceId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    return { name, status: "completed" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    await prisma.productResearchJob.update({
      where: { id: jobId },
      data: { status: "FAILED", errorMessage: message.slice(0, 500), completedAt: new Date() },
    });
    logStructured({
      message: "research step failed",
      correlationId,
      step: name,
      errorCode: message,
    });
    return { name, status: "failed", error: message };
  }
}

export async function runAll(
  actor: string,
  correlationId: string = randomUUID(),
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<{ status: string; steps: StepResult[] }> {
  const startedAt = Date.now();
  const steps: StepResult[] = [];

  // (1) Refresh offers
  steps.push(
    await runStep("refreshOffers", correlationId, actor, workspaceId, () =>
      refreshOffers(actor, workspaceId),
    ),
  );

  // (2) Discovery for each ACTIVE query (skipped if discovery disabled)
  if (featureFlags.productDiscoveryEnabled) {
    const queries = await prisma.productDiscoveryQuery.findMany({
      where: { workspaceId, status: "ACTIVE" },
      select: { id: true },
    });
    for (const q of queries) {
      steps.push(
        await runStep("discovery", correlationId, actor, workspaceId, () =>
          runDiscoveryForQuery(q.id, actor, workspaceId),
        ),
      );
    }
  } else {
    logStructured({ message: "discovery skipped (feature flag off)", correlationId });
  }

  // (3) Recompute matches
  steps.push(
    await runStep("recomputeMatches", correlationId, actor, workspaceId, () =>
      recomputeMatchesForPendingOffers(actor, workspaceId),
    ),
  );

  // (4) Compliance for DISCOVERED / UNDER_REVIEW products
  const complianceProducts = await prisma.product.findMany({
    where: { workspaceId, status: { in: [...statusFilter] } },
    select: { id: true },
  });
  for (const p of complianceProducts) {
    steps.push(
      await runStep("compliance", correlationId, actor, workspaceId, () =>
        evaluateComplianceForProduct(p.id, actor, workspaceId),
      ),
    );
  }

  // (5) Content fit for all products
  const fitProducts = await prisma.product.findMany({
    where: { workspaceId },
    select: { id: true },
  });
  for (const p of fitProducts) {
    steps.push(
      await runStep("contentFit", correlationId, actor, workspaceId, () =>
        analyzeContentFitForProduct(p.id, actor, workspaceId),
      ),
    );
  }

  // (6) Profitability for all active offers
  const activeOffers = await prisma.affiliateOffer.findMany({
    where: { workspaceId, status: { in: ["ACTIVE", "PAUSED"] } },
    select: { id: true },
  });
  for (const o of activeOffers) {
    steps.push(
      await runStep("profitability", correlationId, actor, workspaceId, () =>
        estimateProfitabilityForOffer(o.id, actor, workspaceId),
      ),
    );
  }

  // (7) Opportunity scoring
  steps.push(
    await runStep("opportunityScoring", correlationId, actor, workspaceId, () =>
      scoreProductOpportunities(null, actor, workspaceId),
    ),
  );

  // (8) Expire opportunities
  steps.push(
    await runStep("expireOpportunities", correlationId, actor, workspaceId, () =>
      expireOpportunities(actor, workspaceId),
    ),
  );

  // (9) Data quality scan for all products
  for (const p of fitProducts) {
    steps.push(
      await runStep("dataQuality", correlationId, actor, workspaceId, () =>
        scanDataQualityForProduct(p.id, actor, workspaceId),
      ),
    );
  }

  const failed = steps.filter((s) => s.status === "failed").length;
  const status = failed === 0 ? "completed" : "completed_with_errors";

  const lagSeconds = (Date.now() - startedAt) / 1000;
  incrementMetric(METRICS.productResearchQueueLagSeconds, Math.round(lagSeconds));

  void writeAuditLog({
    action: "product.research.runAll",
    entityType: "ProductResearchJob",
    metadata: { correlationId, steps: steps.length, failed } as Prisma.InputJsonValue,
    actor,
  });

  return { status, steps };
}
