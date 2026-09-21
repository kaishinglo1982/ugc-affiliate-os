import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { tenantPrismaForWorkspace } from "@/lib/db/tenant-client";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { ApprovalResourceType, ApprovalStatus } from "@/generated/prisma/client";

export async function listApprovals(workspaceId: string, filters?: { status?: string; resourceType?: string }) {
  return tenantPrismaForWorkspace(workspaceId).approval.findMany({
    where: {
      workspaceId,
      ...(filters?.status ? { status: filters.status as ApprovalStatus } : {}),
      ...(filters?.resourceType ? { resourceType: filters.resourceType as ApprovalResourceType } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getApproval(id: string, workspaceId: string) {
  return tenantPrismaForWorkspace(workspaceId).approval.findFirst({
    where: { id, workspaceId },
  });
}

export interface CreateApprovalRequestInput {
  resourceType: ApprovalResourceType;
  resourceId: string;
  cost?: Prisma.Decimal | number | null;
  currency?: string | null;
  note?: string | null;
  expiresAt?: Date | null;
}

export async function createApprovalRequest(input: CreateApprovalRequestInput, workspaceId: string) {
  const actor = (await getCurrentUser())?.id ?? "owner";
  const approval = await tenantPrismaForWorkspace(workspaceId).approval.create({
    data: {
      workspaceId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      status: "PENDING",
      requestedBy: actor,
      cost: input.cost != null ? new Prisma.Decimal(Number(input.cost)) : null,
      currency: input.currency ?? null,
      expiresAt: input.expiresAt ?? null,
      payload: input.note ? { note: input.note } : Prisma.JsonNull,
    },
  });
  return approval;
}
