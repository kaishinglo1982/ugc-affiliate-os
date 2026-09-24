import { prisma } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import {
  canTransitionAngle,
  createAngleSchema,
  updateAngleSchema,
  decideAngleSchema,
  type CreateAngleInput,
  type UpdateAngleInput,
} from "@/features/campaign-factory/domain/campaign-angle";
import type {
  CreativeAngleStatus,
  SocialPlatform,
  PublishingFormat,
  HookType,
  ScriptStructureType,
} from "@/generated/prisma/client";

export async function listAngles(
  workspaceId: string,
  opts: { campaignStrategyId?: string; status?: CreativeAngleStatus } = {},
) {
  return prisma.creativeAngle.findMany({
    where: {
      workspaceId,
      ...(opts.campaignStrategyId ? { campaignStrategyId: opts.campaignStrategyId } : {}),
      ...(opts.status ? { status: opts.status } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAngle(id: string, workspaceId: string) {
  return prisma.creativeAngle.findFirst({ where: { id, workspaceId } });
}

export async function createAngle(input: CreateAngleInput, workspaceId: string) {
  const parsed = createAngleSchema.parse(input);
  const strategy = await prisma.campaignStrategy.findFirst({
    where: { id: parsed.campaignStrategyId, workspaceId },
  });
  if (!strategy) throw new Error("Strategie nicht gefunden.");
  if (strategy.status !== "approved") {
    throw new Error("Creative Angles sind nur für freigegebene Strategien erlaubt.");
  }
  const angle = await prisma.creativeAngle.create({
    data: {
      workspaceId,
      campaignStrategyId: parsed.campaignStrategyId,
      name: parsed.name,
      angleType: parsed.angleType,
      description: parsed.description,
      coreMessage: parsed.coreMessage,
      targetProblem: parsed.targetProblem ?? null,
      desiredOutcome: parsed.desiredOutcome ?? null,
      proofStrategy: parsed.proofStrategy ?? null,
      objectionHandled: parsed.objectionHandled ?? null,
      suitablePlatforms: (parsed.suitablePlatforms ?? []) as SocialPlatform[],
      suitableFormats: (parsed.suitableFormats ?? []) as PublishingFormat[],
      recommendedHookTypes: (parsed.recommendedHookTypes ?? []) as HookType[],
      recommendedScriptStructures: (parsed.recommendedScriptStructures ?? []) as ScriptStructureType[],
      riskLevel: parsed.riskLevel ?? "low",
      status: "draft",
    },
  });
  const actor = (await getCurrentUser())?.id ?? "owner";
  await writeAuditLog({
    action: "creative_angle.created",
    entityType: "CreativeAngle",
    entityId: angle.id,
    actor,
  });
  return angle;
}

export async function updateAngle(id: string, input: UpdateAngleInput, workspaceId: string) {
  const parsed = updateAngleSchema.parse(input);
  const angle = await getAngle(id, workspaceId);
  if (!angle) throw new Error("Creative Angle nicht gefunden.");
  if (angle.status !== "draft") {
    throw new Error("Creative Angle ist nicht mehr bearbeitbar.");
  }
  const data: Record<string, unknown> = { ...parsed };
  if (parsed.suitablePlatforms) data.suitablePlatforms = parsed.suitablePlatforms as SocialPlatform[];
  if (parsed.suitableFormats) data.suitableFormats = parsed.suitableFormats as PublishingFormat[];
  if (parsed.recommendedHookTypes) {
    data.recommendedHookTypes = parsed.recommendedHookTypes as HookType[];
  }
  if (parsed.recommendedScriptStructures) {
    data.recommendedScriptStructures = parsed.recommendedScriptStructures as ScriptStructureType[];
  }
  const updated = await prisma.creativeAngle.update({ where: { id, workspaceId }, data });
  const actor = (await getCurrentUser())?.id ?? "owner";
  await writeAuditLog({
    action: "creative_angle.updated",
    entityType: "CreativeAngle",
    entityId: id,
    actor,
  });
  return updated;
}

export async function decideAngle(id: string, body: unknown, workspaceId: string) {
  const parsed = decideAngleSchema.parse(body ?? {});
  const angle = await getAngle(id, workspaceId);
  if (!angle) throw new Error("Creative Angle nicht gefunden.");
  const transition = canTransitionAngle(angle.status, parsed.decision);
  if (!transition.ok) throw new Error(transition.reason);
  const actor = (await getCurrentUser())?.id ?? "owner";
  const updated = await prisma.creativeAngle.update({
    where: { id },
    data: parsed.decision === "approved" ? { status: "approved" } : { status: "rejected" },
  });
  await writeAuditLog({
    action: `creative_angle.${parsed.decision}`,
    entityType: "CreativeAngle",
    entityId: id,
    actor,
  });
  return updated;
}
