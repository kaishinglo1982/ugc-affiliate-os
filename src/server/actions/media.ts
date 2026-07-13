"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
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

    const asset = await prisma.mediaAsset.create({
      data: {
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

  const asset = await prisma.mediaAsset.update({
    where: { id },
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
      prisma.mediaAsset.update({ where: { id: input.id }, data: { archivedAt: new Date() } }),
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
      const asset = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: input.id } });
      const storage = await resolveStorageProvider();
      await storage.remove(asset.storageKey).catch(() => undefined);
      await prisma.mediaAsset.delete({ where: { id: input.id } });
      return { id: input.id };
    },
    entityId: (output) => output.id,
  });
  revalidatePath("/app/media");
  return result;
}
