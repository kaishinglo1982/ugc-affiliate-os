"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { withWorkspaceTransaction } from "@/lib/db/with-workspace-transaction";
import { runMutation } from "@/server/actions/action-helpers";
import { campaignFormSchema, statusChangeSchema, idSchema } from "@/lib/validation/campaigns";
import { isValidCampaignTransition, type CampaignStatus } from "@/features/campaigns/status";
import { ok, fail, newRequestId, type Result } from "@/types/result";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";

export async function saveCampaignAction(
  campaignId: string | null,
  _prevState: Result<{ id: string }> | null,
  formData: FormData,
): Promise<Result<{ id: string }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const parsed = campaignFormSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    targetPlatforms: formData.getAll("targetPlatforms"),
  });
  if (!parsed.success) {
    return fail("Eingabe ungültig.", requestId, parsed.error.flatten().fieldErrors);
  }

  const data = {
    name: parsed.data.name,
    productId: parsed.data.productId || null,
    affiliateLinkId: parsed.data.affiliateLinkId || null,
    audience: parsed.data.audience || null,
    targetPlatforms: parsed.data.targetPlatforms,
    contentGoal: parsed.data.contentGoal || null,
    budget: parsed.data.budget ?? null,
    startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
    endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
    status: parsed.data.status,
    notes: parsed.data.notes || null,
  };

  let workspaceId: string;
  try {
    workspaceId = await resolveWorkspaceId();
  } catch {
    return fail("Workspace-Kontext konnte nicht sicher bestimmt werden.", requestId);
  }

  const campaign = await withWorkspaceTransaction(workspaceId, async (tx) => {
    if (data.productId) {
      const product = await tx.product.findFirst({
        where: { id: data.productId, workspaceId },
        select: { id: true },
      });
      if (!product) throw new Error("CAMPAIGN_PRODUCT_WORKSPACE_MISMATCH");
    }

    if (campaignId) {
      const updated = await tx.campaign.updateMany({
        where: { id: campaignId, workspaceId },
        data,
      });
      if (updated.count !== 1) throw new Error("CAMPAIGN_NOT_FOUND_IN_WORKSPACE");
      return tx.campaign.findFirstOrThrow({ where: { id: campaignId, workspaceId } });
    }

    return tx.campaign.create({ data: { ...data, workspaceId } });
  });

  await writeAuditLog({
    action: campaignId ? "campaign.update" : "campaign.create",
    entityType: "Campaign",
    entityId: campaign.id,
    requestId,
    actor: user.email,
  });

  revalidatePath("/app/campaigns");
  if (campaignId) revalidatePath(`/app/campaigns/${campaignId}`);
  return ok({ id: campaign.id }, requestId);
}

export async function changeCampaignStatusAction(id: string, status: string) {
  const parsed = statusChangeSchema.safeParse({ id, status });
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);
  if (!parsed.success) return fail("Ungültiger Status.", requestId);

  let workspaceId: string;
  try {
    workspaceId = await resolveWorkspaceId();
  } catch {
    return fail("Workspace-Kontext konnte nicht sicher bestimmt werden.", requestId);
  }

  let current: { id: string; status: string };
  let updated: { id: string; status: string };
  try {
    const result = await withWorkspaceTransaction(workspaceId, async (tx) => {
      const existing = await tx.campaign.findFirst({ where: { id, workspaceId } });
      if (!existing) throw new Error("CAMPAIGN_NOT_FOUND_IN_WORKSPACE");
      if (!isValidCampaignTransition(existing.status as CampaignStatus, parsed.data.status as CampaignStatus)) {
        throw new Error("CAMPAIGN_STATUS_TRANSITION_INVALID");
      }
      const changed = await tx.campaign.updateMany({
        where: { id, workspaceId },
        data: { status: parsed.data.status },
      });
      if (changed.count !== 1) throw new Error("CAMPAIGN_NOT_FOUND_IN_WORKSPACE");
      const next = await tx.campaign.findFirstOrThrow({ where: { id, workspaceId } });
      return { current: existing, updated: next };
    });
    current = result.current;
    updated = result.updated;
  } catch (error) {
    if (error instanceof Error && error.message === "CAMPAIGN_STATUS_TRANSITION_INVALID") {
      return fail("Der gewünschte Statuswechsel ist nicht zulässig.", requestId);
    }
    return fail("Kampagne wurde nicht gefunden oder gehört nicht zu diesem Workspace.", requestId);
  }

  await writeAuditLog({
    action: "campaign.status_change",
    entityType: "Campaign",
    entityId: id,
    requestId,
    actor: user.email,
    metadata: { from: current.status, to: parsed.data.status },
  });

  revalidatePath("/app/campaigns");
  revalidatePath(`/app/campaigns/${id}`);
  return ok(updated, requestId);
}

export async function deleteCampaignAction(id: string) {
  const result = await runMutation({
    schema: idSchema,
    input: { id },
    auditAction: "campaign.delete",
    entityType: "Campaign",
    handler: async (input) => {
      const workspaceId = await resolveWorkspaceId();
      return withWorkspaceTransaction(workspaceId, async (tx) => {
        const deleted = await tx.campaign.deleteMany({
          where: { id: input.id, workspaceId },
        });
        if (deleted.count !== 1) throw new Error("CAMPAIGN_NOT_FOUND_IN_WORKSPACE");
        return { id: input.id };
      });
    },
    entityId: (output) => output.id,
  });
  revalidatePath("/app/campaigns");
  return result;
}
