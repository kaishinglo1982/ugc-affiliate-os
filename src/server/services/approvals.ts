import "server-only";

import { createHmac } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import type { ApprovalDecisionStatus, ApprovalResourceType, ApprovalStatus } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { tenantPrismaForWorkspace } from "@/lib/db/tenant-client";

function signatureFor(approvalId: string, approverId: string, status: ApprovalDecisionStatus, signedAt: Date): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("APPROVAL_SIGNING_SECRET_UNAVAILABLE");
  return createHmac("sha256", secret)
    .update(`${approvalId}:${approverId}:${status}:${signedAt.toISOString()}`)
    .digest("hex");
}

export async function listApprovals(
  workspaceId: string,
  filters?: { status?: string; resourceType?: string },
) {
  return tenantPrismaForWorkspace(workspaceId).approval.findMany({
    where: {
      workspaceId,
      ...(filters?.status ? { status: filters.status as ApprovalStatus } : {}),
      ...(filters?.resourceType ? { resourceType: filters.resourceType as ApprovalResourceType } : {}),
    },
    include: { decisions: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getApproval(id: string, workspaceId: string) {
  return tenantPrismaForWorkspace(workspaceId).approval.findFirst({
    where: { id, workspaceId },
    include: { decisions: true },
  });
}

export interface CreateApprovalRequestInput {
  resourceType: ApprovalResourceType;
  resourceId: string;
  cost?: Prisma.Decimal | number | null;
  currency?: string | null;
  note?: string | null;
  expiresAt?: Date | null;
  escalationAt?: Date | null;
  requiredApproverCount?: number;
}

export async function createApprovalRequest(input: CreateApprovalRequestInput, workspaceId: string) {
  const actor = (await getCurrentUser())?.id ?? "owner";
  const requiredApproverCount = Math.max(1, Math.min(4, Math.trunc(input.requiredApproverCount ?? 1)));
  return tenantPrismaForWorkspace(workspaceId).approval.create({
    data: {
      workspaceId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      status: "PENDING",
      requestedBy: actor,
      cost: input.cost != null ? new Prisma.Decimal(Number(input.cost)) : null,
      currency: input.currency ?? null,
      expiresAt: input.expiresAt ?? null,
      escalationAt: input.escalationAt ?? null,
      requiredApproverCount,
      payload: input.note ? { note: input.note } : Prisma.JsonNull,
    },
  });
}

export async function decideApproval(
  id: string,
  workspaceId: string,
  decision: ApprovalDecisionStatus,
  reason: string | undefined,
) {
  const actor = (await getCurrentUser())?.id ?? "owner";
  const db = tenantPrismaForWorkspace(workspaceId);
  const approval = await db.approval.findFirst({
    where: { id, workspaceId },
    include: { decisions: true },
  });

  if (!approval) throw new Error("APPROVAL_NOT_FOUND");
  if (approval.status !== "PENDING") throw new Error("APPROVAL_NOT_PENDING");
  if (approval.consumedAt) throw new Error("APPROVAL_ALREADY_CONSUMED");
  if (approval.expiresAt && approval.expiresAt.getTime() <= Date.now()) throw new Error("APPROVAL_EXPIRED");
  if (approval.requestedBy === actor && approval.requiredApproverCount > 1) {
    throw new Error("FOUR_EYES_REQUESTER_CANNOT_APPROVE");
  }
  if (approval.decisions.some((item) => item.approverId === actor)) {
    throw new Error("APPROVAL_ALREADY_DECIDED_BY_ACTOR");
  }

  const signedAt = new Date();
  const signatureHash = signatureFor(approval.id, actor, decision, signedAt);

  return db.$transaction(async (tx) => {
    const locked = await tx.approval.findFirst({
      where: { id, workspaceId, status: "PENDING", consumedAt: null },
      include: { decisions: true },
    });
    if (!locked) throw new Error("APPROVAL_STATE_CHANGED");

    await tx.approvalDecision.create({
      data: {
        approvalId: locked.id,
        approverId: actor,
        status: decision,
        reason: reason ?? null,
        signedAt,
        signatureHash,
      },
    });

    if (decision === "REJECTED") {
      return tx.approval.update({
        where: { id: locked.id },
        data: { status: "REJECTED", decidedBy: actor, decisionReason: reason ?? null, decidedAt: signedAt },
        include: { decisions: true },
      });
    }

    const approvedCount = locked.decisions.filter((item) => item.status === "APPROVED").length + 1;
    if (approvedCount >= locked.requiredApproverCount) {
      return tx.approval.update({
        where: { id: locked.id },
        data: { status: "APPROVED", decidedBy: actor, decisionReason: reason ?? null, decidedAt: signedAt },
        include: { decisions: true },
      });
    }

    return tx.approval.findUniqueOrThrow({
      where: { id: locked.id },
      include: { decisions: true },
    });
  });
}

export async function consumeApproval(id: string, workspaceId: string) {
  const actor = (await getCurrentUser())?.id ?? "owner";
  const db = tenantPrismaForWorkspace(workspaceId);
  return db.approval.updateMany({
    where: { id, workspaceId, status: "APPROVED", consumedAt: null },
    data: { consumedAt: new Date(), consumedBy: actor },
  });
}

export async function escalateDueApprovals(workspaceId: string) {
  const db = tenantPrismaForWorkspace(workspaceId);
  return db.approval.updateMany({
    where: {
      workspaceId,
      status: "PENDING",
      escalationAt: { lte: new Date() },
      escalatedAt: null,
    },
    data: { escalatedAt: new Date() },
  });
}
