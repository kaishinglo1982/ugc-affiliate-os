"use server";

import { revalidatePath } from "next/cache";
import { withWorkspaceDb } from "@/lib/db/workspace-context";
import { runMutation } from "@/server/actions/action-helpers";
import {
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  mimeToKind,
  mediaMetaSchema,
  idSchema,
} from "@/lib/validation/media";
import { resolveStorageProvider } from "@/lib/providers/storage/registry";
import { ok, fail, newRequestId, type Result } from "@/types/result";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";

function splitTags(input?: string): string[] {
  if (!input) return [];
  return input.split(",").map((t) => t.trim()).filter(Boolean);
}

export interface UploadedAssetSummary {
  id: string;
  fileName: string;
}

async function referencesVisible(productId?: string, campaignId?: string): Promise<boolean> {
  return withWorkspaceDb(async (tx) => {
    const [product, campaign] = await Promise.all([
      productId ? tx.product.findUnique({ where: { id: productId }, select: { id: true } }) : null,
      campaignId ? tx.campaign.findUnique({ where: { id: campaignId }, select: { id: true } }) : null,
    ]);
    return (!productId || Boolean(product)) && (!campaignId || Boolean(campaign));
  });
}

export async function uploadMediaAction(
  _prevState: Result<{ uploaded: UploadedAssetSummary[] }> | null,
  formData: FormData,
): Promise<Result<{ uploaded: UploadedAssetSummary[] }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const metaParsed = mediaMetaSchema.safeParse({
    tags: formData.get("tags") ?? "",
    productId: formData.get("productId") ?? "",
    campaignId: formData.get("campaignId") ?? "",
  });
  if (!metaParsed.success) {
    return fail("Metadaten ungültig.", requestId, metaParsed.error.flatten().fieldErrors);
  }

  const productId = metaParsed.data.productId || undefined;
  const campaignId = metaParsed.data.campaignId || undefined;
  if (!(await referencesVisible(productId, campaignId))) {
    return fail("Produkt oder Kampagne ist in diesem Workspace nicht verfügbar.", requestId);
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return fail("Keine Datei ausgewählt.", requestId);
  }

  const storage = await resolveStorageProvider();
  const uploaded: UploadedAssetSummary[] = [];

  for (const file of files) {
    if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      return fail(`Dateityp nicht erlaubt: ${file.type || file.name}`, requestId);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return fail(`Datei zu groß: ${file.name} (max. 100 MB)`, requestId);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storage.put(file.name, buffer, file.type);

    try {
      const asset = await withWorkspaceDb((tx) =>
        tx.mediaAsset.create({
          data: {
            kind: mimeToKind(file.type),
            fileName: file.name,
            storageKey: stored.storageKey,
            url: stored.url,
            mimeType: file.type,
            sizeBytes: stored.sizeBytes,
            tags: splitTags(metaParsed.data.tags),
            productId: productId ?? null,
            campaignId: campaignId ?? null,
          },
        }),
      );
      uploaded.push({ id: asset.id, fileName: asset.fileName });
    } catch (error) {
      await storage.remove(stored.storageKey).catch(() => undefined);
      throw error;
    }
  }

  await writeAuditLog({
    action: "media.upload",
    entityType: "MediaAsset",
    requestId,
    actor: user.email,
    metadata: { count: uploaded.length },
  });

  revalidatePath("/app/media");
  return ok({ uploaded }, requestId);
}

const updateMetaSchema = idSchema.extend(mediaMetaSchema.shape);

export async function updateMediaAction(
  id: string,
  _prevState: Result<{ id: string }> | null,
  formData: FormData,
): Promise<Result<{ id: string }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const parsed = updateMetaSchema.safeParse({
    id,
    tags: formData.get("tags") ?? "",
    productId: formData.get("productId") ?? "",
    campaignId: formData.get("campaignId") ?? "",
  });
  if (!parsed.success) return fail("Eingabe ungültig.", requestId);

  const productId = parsed.data.productId || undefined;
  const campaignId = parsed.data.campaignId || undefined;
  if (!(await referencesVisible(productId, campaignId))) {
    return fail("Produkt oder Kampagne ist in diesem Workspace nicht verfügbar.", requestId);
  }

  const asset = await withWorkspaceDb(async (tx) => {
    const visible = await tx.mediaAsset.findUnique({ where: { id }, select: { id: true } });
    if (!visible) return null;
    return tx.mediaAsset.update({
      where: { id: visible.id },
      data: {
        tags: splitTags(parsed.data.tags),
        productId: productId ?? null,
        campaignId: campaignId ?? null,
      },
    });
  });

  if (!asset) return fail("Media-Asset nicht gefunden.", requestId);

  await writeAuditLog({
    action: "media.update",
    entityType: "MediaAsset",
    entityId: asset.id,
    requestId,
    actor: user.email,
  });

  revalidatePath("/app/media");
  return ok({ id: asset.id }, requestId);
}

export async function archiveMediaAction(id: string) {
  const result = await runMutation({
    schema: idSchema,
    input: { id },
    auditAction: "media.archive",
    entityType: "MediaAsset",
    handler: async (input) =>
      withWorkspaceDb(async (tx) => {
        const visible = await tx.mediaAsset.findUnique({ where: { id: input.id }, select: { id: true } });
        if (!visible) throw new Error("MEDIA_ASSET_NOT_FOUND");
        return tx.mediaAsset.update({ where: { id: visible.id }, data: { archivedAt: new Date() } });
      }),
    entityId: (output) => output.id,
  });
  revalidatePath("/app/media");
  return result;
}

export async function deleteMediaAction(id: string) {
  const result = await runMutation({
    schema: idSchema,
    input: { id },
    auditAction: "media.delete",
    entityType: "MediaAsset",
    handler: async (input) => {
      const asset = await withWorkspaceDb((tx) =>
        tx.mediaAsset.findUnique({ where: { id: input.id }, select: { id: true, storageKey: true } }),
      );
      if (!asset) throw new Error("MEDIA_ASSET_NOT_FOUND");

      const storage = await resolveStorageProvider();
      await storage.remove(asset.storageKey).catch(() => undefined);
      await withWorkspaceDb((tx) => tx.mediaAsset.delete({ where: { id: asset.id } }));
      return { id: asset.id };
    },
    entityId: (output) => output.id,
  });
  revalidatePath("/app/media");
  return result;
}
