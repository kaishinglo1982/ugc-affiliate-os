import { tenantPrismaForWorkspace } from "@/lib/db/tenant-client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import {
  createAudienceSchema,
  updateAudienceSchema,
  assertAudienceTransition,
  type CreateAudienceInput,
  type UpdateAudienceInput,
} from "@/features/campaign-factory/domain/campaign-audience";
import type { CampaignAudienceStatus } from "@/generated/prisma/client";

export async function listAudiences(
  workspaceId: string,
  opts: { brandId?: string; nicheId?: string; status?: CampaignAudienceStatus } = {},
) {
  return tenantPrismaForWorkspace(workspaceId).campaignAudienceProfile.findMany({
    where: {
      workspaceId,
      ...(opts.brandId ? { brandId: opts.brandId } : {}),
      ...(opts.nicheId ? { nicheId: opts.nicheId } : {}),
      ...(opts.status ? { status: opts.status } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAudience(id: string, workspaceId: string) {
  return tenantPrismaForWorkspace(workspaceId).campaignAudienceProfile.findFirst({
    where: { id, workspaceId },
  });
}

export async function createAudience(input: CreateAudienceInput, workspaceId: string) {
  const parsed = createAudienceSchema.parse(input);
  const audience = await tenantPrismaForWorkspace(workspaceId).campaignAudienceProfile.create({
    data: {
      workspaceId,
      name: parsed.name,
      description: parsed.description,
      brandId: parsed.brandId ?? null,
      nicheId: parsed.nicheId ?? null,
      languageCodes: parsed.languageCodes ?? [],
      countryCodes: parsed.countryCodes ?? [],
      demographicNotes: parsed.demographicNotes ?? [],
      interestTags: parsed.interestTags ?? [],
      problemStatements: parsed.problemStatements ?? [],
      desiredOutcomes: parsed.desiredOutcomes ?? [],
      objections: parsed.objections ?? [],
      trustSignals: parsed.trustSignals ?? [],
      prohibitedTargetingAttributes: parsed.prohibitedTargetingAttributes ?? [],
      status: "draft",
    },
  });
  const actor = (await getCurrentUser())?.id ?? "owner";
  await writeAuditLog({
    action: "campaign_audience.created",
    entityType: "CampaignAudienceProfile",
    entityId: audience.id,
    actor,
  });
  return audience;
}

export async function updateAudience(id: string, input: UpdateAudienceInput, workspaceId: string) {
  const parsed = updateAudienceSchema.parse(input);
  const audience = await getAudience(id, workspaceId);
  if (!audience) throw new Error("Zielgruppe nicht gefunden.");
  if (parsed.status) assertAudienceTransition(audience.status, parsed.status);
  const updated = await tenantPrismaForWorkspace(workspaceId).campaignAudienceProfile.update({ where: { id }, data: parsed });
  const actor = (await getCurrentUser())?.id ?? "owner";
  await writeAuditLog({
    action: "campaign_audience.updated",
    entityType: "CampaignAudienceProfile",
    entityId: id,
    actor,
  });
  return updated;
}

export async function deleteAudience(id: string, workspaceId: string) {
  const audience = await getAudience(id, workspaceId);
  if (!audience) throw new Error("Zielgruppe nicht gefunden.");
  if (audience.status !== "draft") {
    throw new Error("Nur Entwürfe können gelöscht werden.");
  }
  await tenantPrismaForWorkspace(workspaceId).campaignAudienceProfile.delete({ where: { id } });
  const actor = (await getCurrentUser())?.id ?? "owner";
  await writeAuditLog({
    action: "campaign_audience.deleted",
    entityType: "CampaignAudienceProfile",
    entityId: id,
    actor,
  });
}
