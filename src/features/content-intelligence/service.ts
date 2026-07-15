import "server-only";
import { prisma } from "@/lib/db/client";
import { Decimal } from "@/lib/shared/decimal";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { contentIntelligenceProfileSchema, classifyConfidence, canSupersede } from "@/lib/content-intelligence/profile";
import { nextVersion } from "@/lib/content-intelligence/variant";
import { z } from "zod";

const newVariantSchema = z.object({
  parentContentAssetId: z.string().uuid(),
  name: z.string().min(1).max(120),
  generatedBy: z.enum(["HUMAN", "AI"]),
  sourceVariantId: z.string().uuid().optional().nullable(),
  hookText: z.string().max(2000).optional().nullable(),
  scriptText: z.string().max(20000).optional().nullable(),
  captionText: z.string().max(2000).optional().nullable(),
  titleText: z.string().max(500).optional().nullable(),
  callToActionText: z.string().max(1000).optional().nullable(),
});

export class ContentIntelligenceError extends Error {}

export async function analyzeContent(input: unknown, workspaceId: string) {
  const parsed = contentIntelligenceProfileSchema.safeParse(input);
  if (!parsed.success) {
    throw new ContentIntelligenceError("Ungültige Profil-Eingabe.");
  }
  const data = parsed.data;

  const latest = await prisma.contentIntelligenceProfile.findFirst({
    where: { workspaceId, contentAssetId: data.contentAssetId },
    orderBy: { analyzedAt: "desc" },
  });
  if (latest && !canSupersede(latest.analysisSource as "MANUAL" | "RULE_ENGINE" | "AI", data.analysisSource)) {
    throw new ContentIntelligenceError("Manuelles Profil wird nicht automatisch überschrieben.");
  }

  const profile = await prisma.contentIntelligenceProfile.create({
    data: {
      workspaceId,
      contentAssetId: data.contentAssetId,
      contentVariantId: data.contentVariantId ?? null,
      language: data.language,
      durationSeconds: data.durationSeconds != null ? new Decimal(data.durationSeconds.toString()) : null,
      aspectRatio: data.aspectRatio ?? null,
      contentFormat: (data.contentFormat as never) ?? null,
      hookType: (data.hookType as never) ?? null,
      scriptStructure: (data.scriptStructure as never) ?? null,
      callToActionType: (data.callToActionType as never) ?? null,
      visualStyle: data.visualStyle ?? null,
      voiceStyle: data.voiceStyle ?? null,
      pacing: data.pacing ?? null,
      sentiment: data.sentiment ?? null,
      productMentionCount: data.productMentionCount,
      affiliateDisclosurePresent: data.affiliateDisclosurePresent,
      subtitlePresent: data.subtitlePresent,
      faceVisible: data.faceVisible ?? null,
      avatarUsed: data.avatarUsed ?? null,
      analysisSource: data.analysisSource,
      modelReference: data.modelReference ?? null,
      confidenceScore: data.confidenceScore != null ? new Decimal(data.confidenceScore) : null,
      supersededByProfileId: null,
    },
  });

  if (latest) {
    await prisma.contentIntelligenceProfile.update({
      where: { id: latest.id },
      data: { supersededByProfileId: profile.id },
    });
  }
  const actor = (await getCurrentUser())?.id ?? "owner";
  await writeAuditLog({ action: "content_intelligence.analyzed", entityType: "ContentIntelligenceProfile", entityId: profile.id, actor, metadata: { confidence: classifyConfidence(data.confidenceScore ?? null) } });
  return profile;
}

export async function listVariants(contentAssetId: string, workspaceId: string) {
  return prisma.contentVariant.findMany({
    where: { workspaceId, parentContentAssetId: contentAssetId },
    orderBy: { version: "desc" },
  });
}

export async function createVariant(input: unknown, workspaceId: string) {
  const parsed = newVariantSchema.safeParse(input);
  if (!parsed.success) {
    throw new ContentIntelligenceError("Ungültige Varianten-Eingabe.");
  }
  const data = parsed.data;
  const existing = await prisma.contentVariant.findMany({
    where: { parentContentAssetId: data.parentContentAssetId },
    select: { version: true },
  });
  const version = nextVersion(existing.map((v) => v.version));

  const variant = await prisma.contentVariant.create({
    data: {
      workspaceId,
      parentContentAssetId: data.parentContentAssetId,
      name: data.name,
      version,
      status: "DRAFT",
      hookText: data.hookText ?? null,
      scriptText: data.scriptText ?? null,
      captionText: data.captionText ?? null,
      titleText: data.titleText ?? null,
      callToActionText: data.callToActionText ?? null,
      generatedBy: data.generatedBy,
      sourceVariantId: data.sourceVariantId ?? null,
      approvalStatus: "DRAFT",
    },
  });
  const actor = (await getCurrentUser())?.id ?? "owner";
  await writeAuditLog({ action: "content_variant.created", entityType: "ContentVariant", entityId: variant.id, actor, metadata: { version } });
  return variant;
}
