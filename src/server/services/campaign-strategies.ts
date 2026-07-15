import { prisma } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { createApprovalRequest } from "@/server/services/approvals";
import {
  canTransitionStrategy,
  createStrategySchema,
  updateStrategySchema,
  requestStrategyApprovalSchema,
  decideStrategySchema,
  type CreateStrategyInput,
  type UpdateStrategyInput,
} from "@/features/campaign-factory/domain/campaign-strategy";
import type { CampaignStrategyStatus, SocialPlatform } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";

export async function listStrategies(
  workspaceId: string,
  opts: { campaignCandidateId?: string; status?: CampaignStrategyStatus } = {},
) {
  return prisma.campaignStrategy.findMany({
    where: {
      workspaceId,
      ...(opts.campaignCandidateId ? { campaignCandidateId: opts.campaignCandidateId } : {}),
      ...(opts.status ? { status: opts.status } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getStrategy(id: string, workspaceId: string) {
  return prisma.campaignStrategy.findFirst({ where: { id, workspaceId } });
}

export async function createStrategy(input: CreateStrategyInput, workspaceId: string) {
  const parsed = createStrategySchema.parse(input);
  const candidate = await prisma.campaignCandidate.findFirst({
    where: { id: parsed.campaignCandidateId, workspaceId },
  });
  if (!candidate) throw new Error("Kampagnen-Kandidat nicht gefunden.");
  if (candidate.status !== "approved") {
    throw new Error("Nur ein freigegebener Kandidat kann eine Strategie erhalten.");
  }
  const existing = await prisma.campaignStrategy.findFirst({
    where: { campaignCandidateId: parsed.campaignCandidateId, workspaceId },
  });
  if (existing) throw new Error("Für diesen Kandidaten existiert bereits eine Strategie.");

  const strategy = await prisma.campaignStrategy.create({
    data: {
      workspaceId,
      campaignCandidateId: parsed.campaignCandidateId,
      name: parsed.name,
      objective: parsed.objective,
      primarySuccessMetric: parsed.primarySuccessMetric,
      description: parsed.description ?? null,
      targetPlatforms: (parsed.targetPlatforms ?? []) as SocialPlatform[],
      targetCountryCodes: parsed.targetCountryCodes ?? [],
      languageCode: parsed.languageCode ?? "de",
      targetAudienceProfileId: parsed.targetAudienceProfileId ?? null,
      campaignDurationDays: parsed.campaignDurationDays ?? null,
      plannedContentCount: parsed.plannedContentCount ?? 1,
      estimatedBudget:
        parsed.estimatedBudget != null ? new Prisma.Decimal(Number(parsed.estimatedBudget)) : null,
      currency: parsed.currency ?? null,
      riskLevel: parsed.riskLevel ?? "low",
      status: "draft",
    },
  });
  const actor = (await getCurrentUser())?.id ?? "owner";
  await writeAuditLog({
    action: "campaign_strategy.created",
    entityType: "CampaignStrategy",
    entityId: strategy.id,
    actor,
  });
  return strategy;
}

export async function updateStrategy(id: string, input: UpdateStrategyInput, workspaceId: string) {
  const parsed = updateStrategySchema.parse(input);
  const strategy = await getStrategy(id, workspaceId);
  if (!strategy) throw new Error("Strategie nicht gefunden.");
  if (!["draft", "under_review"].includes(strategy.status)) {
    throw new Error("Strategie ist nicht mehr bearbeitbar.");
  }
  const data: Record<string, unknown> = { ...parsed };
  if (parsed.targetPlatforms) data.targetPlatforms = parsed.targetPlatforms as SocialPlatform[];
  if (parsed.estimatedBudget != null) {
    data.estimatedBudget = new Prisma.Decimal(Number(parsed.estimatedBudget));
  }
  const updated = await prisma.campaignStrategy.update({ where: { id }, data });
  const actor = (await getCurrentUser())?.id ?? "owner";
  await writeAuditLog({
    action: "campaign_strategy.updated",
    entityType: "CampaignStrategy",
    entityId: id,
    actor,
  });
  return updated;
}

export async function requestStrategyApproval(id: string, body: unknown, workspaceId: string) {
  const parsed = requestStrategyApprovalSchema.parse(body ?? {});
  const strategy = await getStrategy(id, workspaceId);
  if (!strategy) throw new Error("Strategie nicht gefunden.");
  const transition = canTransitionStrategy(strategy.status, "under_review");
  if (!transition.ok) throw new Error(transition.reason);
  const updated = await prisma.campaignStrategy.update({
    where: { id },
    data: { status: "under_review" },
  });
  await createApprovalRequest(
    {
      resourceType: "campaign_strategy",
      resourceId: id,
      note: parsed.note ?? null,
      expiresAt: null,
    },
    workspaceId,
  );
  const actor = (await getCurrentUser())?.id ?? "owner";
  await writeAuditLog({
    action: "campaign_strategy.requested_approval",
    entityType: "CampaignStrategy",
    entityId: id,
    actor,
  });
  return updated;
}

export async function decideStrategy(id: string, body: unknown, workspaceId: string) {
  const parsed = decideStrategySchema.parse(body ?? {});
  const strategy = await getStrategy(id, workspaceId);
  if (!strategy) throw new Error("Strategie nicht gefunden.");
  const transition = canTransitionStrategy(strategy.status, parsed.decision);
  if (!transition.ok) throw new Error(transition.reason);
  const actor = (await getCurrentUser())?.id ?? "owner";
  const updated = await prisma.campaignStrategy.update({
    where: { id },
    data:
      parsed.decision === "approved"
        ? { status: "approved", approvedById: actor, approvedAt: new Date() }
        : { status: "rejected", rejectedReason: parsed.reason ?? null },
  });
  await writeAuditLog({
    action: `campaign_strategy.${parsed.decision}`,
    entityType: "CampaignStrategy",
    entityId: id,
    actor,
  });
  return updated;
}
