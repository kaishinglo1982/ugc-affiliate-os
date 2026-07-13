"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
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

  const campaign = campaignId
    ? await prisma.campaign.update({ where: { id: campaignId }, data })
    : await prisma.campaign.create({ data });

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

  const current = await prisma.campaign.findUniqueOrThrow({ where: { id } });

  if (!isValidCampaignTransition(current.status as CampaignStatus, parsed.data.status as CampaignStatus)) {
    return fail(
      `Statuswechsel von "${current.status}" zu "${parsed.data.status}" ist nicht zulässig.`,
      requestId,
    );
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data: { status: parsed.data.status },
  });

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
      await prisma.campaign.delete({ where: { id: input.id } });
      return { id: input.id };
    },
    entityId: (output) => output.id,
  });
  revalidatePath("/app/campaigns");
  return result;
}
