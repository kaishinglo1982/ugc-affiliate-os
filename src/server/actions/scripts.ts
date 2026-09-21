"use server";

import { revalidatePath } from "next/cache";
import { runMutation } from "@/server/actions/action-helpers";
import { scriptGenerateSchema, idSchema, scriptStatusEnum } from "@/lib/validation/scripts";
import { resolveScriptProvider } from "@/lib/providers/llm/registry";
import { ok, fail, newRequestId, type Result } from "@/types/result";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { withWorkspaceDb } from "@/lib/db/workspace-context";
import { z } from "zod";

export async function generateScriptAction(
  _prevState: Result<{ id: string }> | null,
  formData: FormData,
): Promise<Result<{ id: string }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const parsed = scriptGenerateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", requestId, parsed.error.flatten().fieldErrors);
  }

  const input = parsed.data;
  const ownership = await withWorkspaceDb(async (tx, workspaceId) => {
    const product = input.productId
      ? await tx.product.findFirst({ where: { id: input.productId, workspaceId } })
      : null;
    const campaign = input.campaignId
      ? await tx.campaign.findUnique({ where: { id: input.campaignId }, select: { id: true } })
      : null;
    if (input.productId && !product) throw new Error("SCRIPT_PRODUCT_OUTSIDE_WORKSPACE");
    if (input.campaignId && !campaign) throw new Error("SCRIPT_CAMPAIGN_OUTSIDE_WORKSPACE");
    if (!product && !campaign) throw new Error("SCRIPT_WORKSPACE_OWNERSHIP_REQUIRED");
    return { product };
  });

  const provider = resolveScriptProvider(input.provider);
  const generated = await provider.generate({
    productName: ownership.product?.name ?? input.title,
    productDescription: ownership.product?.description,
    problemSolved: ownership.product?.problemSolved,
    audience: input.audience,
    platform: input.platform,
    durationSec: input.durationSec,
    tone: input.tone,
    hookType: input.hookType,
    cta: input.cta,
  });

  const script = await withWorkspaceDb((tx) =>
    tx.script.create({
      data: {
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
    }),
  );

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
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const script = await withWorkspaceDb((tx) =>
    tx.script.findUnique({
      where: { id: scriptId },
      include: { product: true, versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    }),
  );
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
  await withWorkspaceDb(async (tx) => {
    const ownedScript = await tx.script.findUnique({ where: { id: script.id }, select: { id: true } });
    if (!ownedScript) throw new Error("SCRIPT_OUTSIDE_WORKSPACE");
    await tx.scriptVersion.create({
      data: {
        scriptId: script.id,
        versionNumber: nextVersion,
        ...generated,
        sceneList: generated.sceneList,
        generatedBy: provider.key,
      },
    });
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
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const copy = await withWorkspaceDb(async (tx) => {
    const original = await tx.script.findUnique({
      where: { id },
      include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    });
    if (!original) return null;

    const latest = original.versions[0];
    return tx.script.create({
      data: {
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
  });
  if (!copy) return fail("Skript nicht gefunden.", requestId);

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
    handler: async (input) =>
      withWorkspaceDb((tx) =>
        tx.script.update({ where: { id: input.id }, data: { status: input.status } }),
      ),
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
    handler: async (input) =>
      withWorkspaceDb(async (tx) => {
        await tx.script.delete({ where: { id: input.id } });
        return { id: input.id };
      }),
    entityId: (output) => output.id,
  });
  revalidatePath("/app/scripts");
  return result;
}
