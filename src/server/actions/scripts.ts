"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { runMutation } from "@/server/actions/action-helpers";
import { scriptGenerateSchema, idSchema, scriptStatusEnum } from "@/lib/validation/scripts";
import { resolveScriptProvider } from "@/lib/providers/llm/registry";
import { ok, fail, newRequestId, type Result } from "@/types/result";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { z } from "zod";
import { resolveWorkspaceId } from "@/lib/auth/tenant";

export async function generateScriptAction(
  _prevState: Result<{ id: string }> | null,
  formData: FormData,
): Promise<Result<{ id: string }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  const workspaceId = await resolveWorkspaceId();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const parsed = scriptGenerateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", requestId, parsed.error.flatten().fieldErrors);
  }

  const input = parsed.data;
  const [product, campaign] = await Promise.all([
    input.productId ? prisma.product.findFirst({ where: { id: input.productId, workspaceId } }) : null,
    input.campaignId ? prisma.campaign.findFirst({ where: { id: input.campaignId, workspaceId }, select: { id: true } }) : null,
  ]);
  if (input.productId && !product) return fail("Produkt nicht gefunden.", requestId);
  if (input.campaignId && !campaign) return fail("Kampagne nicht gefunden.", requestId);

  const provider = resolveScriptProvider(input.provider);
  const generated = await provider.generate({
    productName: product?.name ?? input.title,
    productDescription: product?.description,
    problemSolved: product?.problemSolved,
    audience: input.audience,
    platform: input.platform,
    durationSec: input.durationSec,
    tone: input.tone,
    hookType: input.hookType,
    cta: input.cta,
  });

  const script = await prisma.script.create({
    data: {
      workspaceId,
      title: input.title,
      productId: input.productId || null,
      campaignId: input.campaignId || null,
      audience: input.audience,
      platform: input.platform,
      durationSec: input.durationSec,
      tone: input.tone,
      hookType: input.hookType,
      cta: input.cta,
      status: "DRAFT",
      versions: {
        create: {
          versionNumber: 1,
          ...generated,
          sceneList: generated.sceneList,
          generatedBy: provider.key,
        },
      },
    },
  });

  await writeAuditLog({
    action: "script.create",
    entityType: "Script",
    entityId: script.id,
    requestId,
    actor: user.email,
    metadata: { provider: provider.key },
  });

  revalidatePath("/app/scripts");
  return ok({ id: script.id }, requestId);
}

export async function regenerateScriptVersionAction(
  scriptId: string,
): Promise<Result<{ id: string; versionNumber: number }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  const workspaceId = await resolveWorkspaceId();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const script = await prisma.script.findFirst({
    where: { id: scriptId, workspaceId },
    include: { product: true, versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });
  if (!script) return fail("Skript nicht gefunden.", requestId);

  const provider = resolveScriptProvider("template");
  const generated = await provider.generate({
    productName: script.product?.name ?? script.title,
    productDescription: script.product?.description,
    problemSolved: script.product?.problemSolved,
    audience: script.audience ?? "Allgemeine Zielgruppe",
    platform: script.platform ?? "TikTok",
    durationSec: script.durationSec ?? 30,
    tone: script.tone ?? "Locker",
    hookType: script.hookType ?? "Problem-Agitate-Solve",
    cta: script.cta ?? "Link in Bio",
  });

  const nextVersion = (script.versions[0]?.versionNumber ?? 0) + 1;

  await prisma.scriptVersion.create({
    data: {
      scriptId: script.id,
      versionNumber: nextVersion,
      ...generated,
      sceneList: generated.sceneList,
      generatedBy: provider.key,
    },
  });

  await writeAuditLog({
    action: "script.version_create",
    entityType: "Script",
    entityId: script.id,
    requestId,
    actor: user.email,
    metadata: { versionNumber: nextVersion },
  });

  revalidatePath("/app/scripts");
  return ok({ id: script.id, versionNumber: nextVersion }, requestId);
}

export async function duplicateScriptAction(id: string): Promise<Result<{ id: string }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  const workspaceId = await resolveWorkspaceId();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const original = await prisma.script.findFirst({
    where: { id, workspaceId },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });
  if (!original) return fail("Skript nicht gefunden.", requestId);

  const latest = original.versions[0];
  const copy = await prisma.script.create({
    data: {
      workspaceId,
      title: `${original.title} (Kopie)`,
      productId: original.productId,
      campaignId: original.campaignId,
      audience: original.audience,
      platform: original.platform,
      durationSec: original.durationSec,
      tone: original.tone,
      hookType: original.hookType,
      cta: original.cta,
      status: "DRAFT",
      versions: latest
        ? {
            create: {
              versionNumber: 1,
              hook: latest.hook,
              problem: latest.problem,
              situation: latest.situation,
              productIntro: latest.productIntro,
              demonstration: latest.demonstration,
              benefit: latest.benefit,
              socialProof: latest.socialProof,
              objectionHandling: latest.objectionHandling,
              cta: latest.cta,
              onScreenText: latest.onScreenText,
              bRollNotes: latest.bRollNotes,
              voiceover: latest.voiceover,
              sceneList: latest.sceneList as object,
              generatedBy: latest.generatedBy,
            },
          }
        : undefined,
    },
  });

  await writeAuditLog({
    action: "script.create",
    entityType: "Script",
    entityId: copy.id,
    requestId,
    actor: user.email,
    metadata: { duplicatedFrom: id },
  });

  revalidatePath("/app/scripts");
  return ok({ id: copy.id }, requestId);
}

const statusChangeSchema = z.object({ id: z.string().uuid(), status: scriptStatusEnum });

export async function changeScriptStatusAction(id: string, status: string) {
  const result = await runMutation({
    schema: statusChangeSchema,
    input: { id, status },
    auditAction: "script.status_change",
    entityType: "Script",
    handler: async (input) => {
      const workspaceId = await resolveWorkspaceId();
      const existing = await prisma.script.findFirst({ where: { id: input.id, workspaceId } });
      if (!existing) throw new Error("SCRIPT_NOT_FOUND");
      return prisma.script.update({ where: { id: existing.id }, data: { status: input.status } });
    },
    entityId: (output) => output.id,
  });
  revalidatePath("/app/scripts");
  return result;
}

export async function deleteScriptAction(id: string) {
  const result = await runMutation({
    schema: idSchema,
    input: { id },
    auditAction: "script.delete",
    entityType: "Script",
    handler: async (input) => {
      const workspaceId = await resolveWorkspaceId();
      const existing = await prisma.script.findFirst({ where: { id: input.id, workspaceId } });
      if (!existing) throw new Error("SCRIPT_NOT_FOUND");
      await prisma.script.delete({ where: { id: existing.id } });
      return { id: input.id };
    },
    entityId: (output) => output.id,
  });
  revalidatePath("/app/scripts");
  return result;
}
