import "server-only";
import { prisma } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import {
  isOpportunityConvertible,
  canTransitionCandidate,
  createCampaignCandidateSchema,
  requestApprovalSchema,
  decideCandidateSchema,
  convertCandidateSchema,
  type CreateCampaignCandidateInput,
} from "@/features/campaign-factory/domain/campaign-candidate";
import { createApprovalRequest } from "@/server/services/approvals";
import type { CampaignCandidateStatus, SocialPlatform } from "@/generated/prisma/client";

export async function listCampaignCandidates(
  workspaceId: string,
  filters?: { status?: string; productOpportunityId?: string },
) {
  return prisma.campaignCandidate.findMany({
    where: {
      workspaceId,
      ...(filters?.status ? { status: filters.status as CampaignCandidateStatus } : {}),
      ...(filters?.productOpportunityId ? { productOpportunityId: filters.productOpportunityId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCampaignCandidate(id: string, workspaceId: string) {
  return prisma.campaignCandidate.findFirst({
    where: { id, workspaceId },
  });
}

async function assertConvertibleOpportunity(opportunityId: string, workspaceId: string) {
  const opportunity = await prisma.productOpportunity.findFirst({
    where: { id: opportunityId, workspaceId },
    include: { product: true, offer: true },
  });
  if (!opportunity) throw new Error("Product Opportunity nicht gefunden.");
  const product = opportunity.product;
  if (!product || product.status !== "APPROVED") throw new Error("Produkt ist nicht freigegeben.");
  const offer = opportunity.offer;
  if (!offer || offer.status !== "ACTIVE") throw new Error("Affiliate Offer ist nicht aktiv.");
  if (opportunity.brandId) {
    const brand = await prisma.brand.findUnique({ where: { id: opportunity.brandId } });
    if (brand && (brand.status === "PAUSED" || brand.status === "ARCHIVED")) {
      throw new Error("Brand ist pausiert.");
    }
  }
  const convertible = isOpportunityConvertible(
    opportunity.status,
    opportunity.expiresAt,
  );
  if (!convertible.ok) throw new Error(convertible.reason);
  return opportunity;
}

export async function createCampaignCandidate(input: CreateCampaignCandidateInput, workspaceId: string) {
  const parsed = createCampaignCandidateSchema.parse(input);
  const opportunity = await assertConvertibleOpportunity(parsed.productOpportunityId, workspaceId);

  const existing = await prisma.campaignCandidate.findFirst({
    where: {
      workspaceId,
      productOpportunityId: parsed.productOpportunityId,
      status: { in: ["new", "under_review", "approved"] },
    },
  });
  if (existing) {
    return { candidate: existing, idempotent: true };
  }

  const actor = (await getCurrentUser())?.id ?? "owner";
  const candidate = await prisma.campaignCandidate.create({
    data: {
      workspaceId,
      productOpportunityId: opportunity.id,
      productId: opportunity.productId,
      affiliateOfferId: opportunity.affiliateOfferId,
      affiliateProgramId: opportunity.offer?.affiliateProgramId ?? "",
      brandId: opportunity.brandId ?? null,
      nicheId: opportunity.nicheId ?? null,
      opportunityScore: opportunity.totalScore,
      opportunityConfidence: opportunity.confidenceScore,
      proposedObjective: parsed.proposedObjective ?? undefined,
      targetPlatformCandidates: (parsed.targetPlatformCandidates ?? []) as SocialPlatform[],
      targetCountryCodes: parsed.targetCountryCodes ?? [],
      languageCode: parsed.languageCode ?? "de",
      currency: parsed.currency ?? null,
      sourceScoreVersion: opportunity.scoringVersion,
      evidenceReferences: parsed.evidenceReferences ?? opportunity.evidenceReferences,
    },
  });

  await writeAuditLog({
    action: "campaign_candidate.created",
    entityType: "CampaignCandidate",
    entityId: candidate.id,
    actor,
    metadata: { productOpportunityId: opportunity.id },
  });

  return { candidate, idempotent: false };
}

export async function requestCandidateApproval(id: string, body: unknown, workspaceId: string) {
  const parsed = requestApprovalSchema.parse(body);
  const candidate = await getCampaignCandidate(id, workspaceId);
  if (!candidate) throw new Error("Kandidat nicht gefunden.");
  if (!canTransitionCandidate(candidate.status, "under_review")) {
    throw new Error("Kandidat kann nicht zur Prüfung eingereicht werden.");
  }
  const actor = (await getCurrentUser())?.id ?? "owner";
  const updated = await prisma.campaignCandidate.update({
    where: { id },
    data: { status: "under_review" },
  });
  await createApprovalRequest(
    {
      resourceType: "campaign_candidate",
      resourceId: id,
      cost: candidate.estimatedCampaignCost,
      currency: candidate.currency,
      note: parsed.note,
    },
    workspaceId,
  );
  await writeAuditLog({
    action: "campaign_candidate.approval_requested",
    entityType: "CampaignCandidate",
    entityId: id,
    actor,
  });
  return updated;
}

export async function decideCandidate(id: string, body: unknown, workspaceId: string) {
  const parsed = decideCandidateSchema.parse(body);
  const candidate = await getCampaignCandidate(id, workspaceId);
  if (!candidate) throw new Error("Kandidat nicht gefunden.");
  const to: CampaignCandidateStatus = parsed.decision === "approved" ? "approved" : "rejected";
  if (!canTransitionCandidate(candidate.status, to)) {
    throw new Error("Statusübergang nicht erlaubt.");
  }
  const actor = (await getCurrentUser())?.id ?? "owner";
  const updated = await prisma.campaignCandidate.update({ where: { id }, data: { status: to } });
  await writeAuditLog({
    action: parsed.decision === "approved" ? "campaign_candidate.approved" : "campaign_candidate.rejected",
    entityType: "CampaignCandidate",
    entityId: id,
    actor,
    metadata: { reason: parsed.reason },
  });
  return updated;
}

export async function convertCandidate(id: string, body: unknown, workspaceId: string) {
  const parsed = convertCandidateSchema.parse(body);
  const candidate = await getCampaignCandidate(id, workspaceId);
  if (!candidate) throw new Error("Kandidat nicht gefunden.");
  if (candidate.status === "converted") {
    throw new Error("Kandidat wurde bereits konvertiert.");
  }
  if (candidate.status !== "approved") {
    throw new Error("Nur freigegebene Kandidaten können konvertiert werden.");
  }
  const actor = (await getCurrentUser())?.id ?? "owner";
  const campaign = await prisma.campaign.create({
    data: {
      name: parsed.name,
      productId: candidate.productId,
      status: "DRAFT",
      notes: `Erzeugt aus Campaign Candidate ${id}`,
    },
  });
  const updated = await prisma.campaignCandidate.update({
    where: { id },
    data: { status: "converted" },
  });
  await writeAuditLog({
    action: "campaign_candidate.converted",
    entityType: "CampaignCandidate",
    entityId: id,
    actor,
    metadata: { campaignId: campaign.id },
  });
  return { candidate: updated, campaign };
}

export async function recalculateCandidate(id: string, workspaceId: string) {
  const candidate = await getCampaignCandidate(id, workspaceId);
  if (!candidate) throw new Error("Kandidat nicht gefunden.");
  const opportunity = await prisma.productOpportunity.findFirst({
    where: { id: candidate.productOpportunityId, workspaceId },
  });
  if (!opportunity) throw new Error("Opportunity nicht gefunden.");
  const updated = await prisma.campaignCandidate.update({
    where: { id },
    data: {
      opportunityScore: opportunity.totalScore,
      opportunityConfidence: opportunity.confidenceScore,
      sourceScoreVersion: opportunity.scoringVersion,
      evidenceReferences: opportunity.evidenceReferences,
    },
  });
  const actor = (await getCurrentUser())?.id ?? "owner";
  await writeAuditLog({
    action: "campaign_candidate.updated",
    entityType: "CampaignCandidate",
    entityId: id,
    actor,
  });
  return updated;
}

export async function expireCandidate(id: string, workspaceId: string) {
  const candidate = await getCampaignCandidate(id, workspaceId);
  if (!candidate) return null;
  if (!["new", "under_review", "approved"].includes(candidate.status)) return candidate;
  const updated = await prisma.campaignCandidate.update({ where: { id }, data: { status: "expired" } });
  const actor = (await getCurrentUser())?.id ?? "owner";
  await writeAuditLog({
    action: "campaign_candidate.expired",
    entityType: "CampaignCandidate",
    entityId: id,
    actor,
  });
  return updated;
}
