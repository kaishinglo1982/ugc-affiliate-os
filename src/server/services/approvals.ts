import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { ApprovalResourceType, ApprovalStatus } from "@/generated/prisma/client";

export async function listApprovals(workspaceId: string, filters?: { status?: string; resourceType?: string }) {
  return prisma.approval.findMany({
    where: {
      workspaceId,
      ...(filters?.status ? { status: filters.status as ApprovalStatus } : {}),
      ...(filters?.resourceType ? { resourceType: filters.resourceType as ApprovalResourceType } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getApproval(id: string, workspaceId: string) {
  return prisma.approval.findFirst({
    where: { id, workspaceId },
  });
}

export interface CreateApprovalRequestInput {
  resourceType: ApprovalResourceType;
  resourceId: string;
  cost?: Prisma.Decimal | number | null;
  currency?: string | null;
  note?: string | null;
  payload?: unknown;
  requestedBy?: string;
  expiresAt?: Date | null;
}

export async function createApprovalRequest(input: CreateApprovalRequestInput, workspaceId: string) {
  const actor = input.requestedBy ?? (await getCurrentUser())?.id ?? "owner";
  const approval = await prisma.approval.create({
    data: {
      workspaceId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      status: "PENDING",
      requestedBy: actor,
      cost: input.cost != null ? new Prisma.Decimal(Number(input.cost)) : null,
      currency: input.currency ?? null,
      expiresAt: input.expiresAt ?? null,
      payload:
        input.payload !== undefined
          ? (input.payload as Prisma.InputJsonValue)
          : input.note
            ? { note: input.note }
            : Prisma.JsonNull,
    },
  });
  return approval;
}


export type ApprovalDecision = "APPROVED" | "REJECTED";

export async function decideApproval(
  id: string,
  workspaceId: string,
  input: {
    decision: ApprovalDecision;
    decisionReason?: string;
    decidedBy: string;
  },
) {
  const existing = await prisma.approval.findFirst({
    where: { id, workspaceId },
    select: { id: true, status: true, expiresAt: true },
  });
  if (!existing) {
    throw new Error("APPROVAL_NOT_FOUND");
  }
  if (existing.status !== "PENDING") {
    throw new Error("APPROVAL_ALREADY_DECIDED");
  }
  if (existing.expiresAt && existing.expiresAt.getTime() <= Date.now()) {
    throw new Error("APPROVAL_EXPIRED");
  }

  const updated = await prisma.approval.updateMany({
    where: { id, workspaceId, status: "PENDING" },
    data: {
      status: input.decision,
      decidedBy: input.decidedBy,
      decisionReason: input.decisionReason,
      decidedAt: new Date(),
    },
  });
  if (updated.count !== 1) {
    throw new Error("APPROVAL_ALREADY_DECIDED");
  }

  const approval = await prisma.approval.findFirst({
    where: { id, workspaceId },
  });
  if (!approval) {
    throw new Error("APPROVAL_NOT_FOUND");
  }
  return approval;
}
