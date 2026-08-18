"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
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
  return input.split(",").map((tag) => tag.trim()).filter(Boolean);
}

async function validateMediaRelations(
  workspaceId: string,
  input: { productId?: string | null; campaignId?: string | null },
) {
  const [product, campaign] = await Promise.all([
    input.productId
      ? prisma.product.findFirst({ where: { id: input.productId, workspaceId }, select: { id: true } })
      : null,
    input.campaignId
      ? prisma.campaign.findFirst({ where: { id: input.campaignId, workspaceId }, select: { id: true } })
      : null,
  ]);
  return {
    validProduct: !input.productId || Boolean(product),
    validCampaign: !input.campaignId || Boolean(campaign),
  };
}

export interface UploadedAssetSummary {
  id: string;
  fileName: string;
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

  const files = formData.getAll("files").filter((file): file is File => file instanceof File && file.size > 0);
  if (files.length === 0) return fail("Keine Datei ausgewählt.", requestId);

  const workspaceId = await resolveWorkspaceId();
  const relations = await validateMediaRelations(workspaceId, metaParsed.data);
  if (!relations.validProduct) return fail("Produkt nicht gefunden.", requestId);
  if (!relations.validCampaign) return fail("Kampagne nicht gefunden.", requestId);

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
    const asset = await prisma.mediaAsset.create({
      data: {
        workspaceId,
        kind: mimeToKind(file.type),
        fileName: file.name,
        storageKey: stored.storageKey,
        url: stored.url,
        mimeType: file.type,
        sizeBytes: stored.sizeBytes,
        tags: splitTags(metaParsed.data.tags),
        productId: metaParsed.data.productId || null,
        campaignId: metaParsed.data.campaignId || null,
      },
    });
    uploaded.push({ id: asset.id, fileName: asset.fileName });
  }

  await writeAuditLog({
    action: "media.upload",
    entityType: "MediaAsset",
    requestId,
    actor: user.email,
    workspaceId,
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

  const workspaceId = await resolveWorkspaceId();
  const existing = await prisma.mediaAsset.findFirst({ where: { id, workspaceId }, select: { id: true } });
  if (!existing) return fail("Medien-Datei nicht gefunden.", requestId);
  const relations = await validateMediaRelations(workspaceId, parsed.data);
  if (!relations.validProduct) return fail("Produkt nicht gefunden.", requestId);
  if (!relations.validCampaign) return fail("Kampagne nicht gefunden.", requestId);

  const asset = await prisma.mediaAsset.update({
    where: { id: existing.id },
    data: {
      tags: splitTags(parsed.data.tags),
      productId: parsed.data.productId || null,
      campaignId: parsed.data.campaignId || null,
    },
  });

  await writeAuditLog({
    action: "media.update",
    entityType: "MediaAsset",
    entityId: asset.id,
    requestId,
    actor: user.email,
    workspaceId,
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
    handler: async (input, _user, workspaceId) => {
      const asset = await prisma.mediaAsset.findFirst({ where: { id: input.id, workspaceId }, select: { id: true } });
      if (!asset) throw new Error("MEDIA_ASSET_NOT_FOUND");
      return prisma.mediaAsset.update({ where: { id: asset.id }, data: { archivedAt: new Date() } });
    },
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
    handler: async (input, _user, workspaceId) => {
      const asset = await prisma.mediaAsset.findFirst({ where: { id: input.id, workspaceId } });
      if (!asset) throw new Error("MEDIA_ASSET_NOT_FOUND");
      const storage = await resolveStorageProvider();
      await storage.remove(asset.storageKey).catch(() => undefined);
      await prisma.mediaAsset.delete({ where: { id: asset.id } });
      return { id: asset.id };
    },
    entityId: (output) => output.id,
  });
  revalidatePath("/app/media");
  return result;
}
