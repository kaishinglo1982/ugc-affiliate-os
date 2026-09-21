import "server-only";
import { tenantPrismaForWorkspace } from "@/lib/db/tenant-client";

export async function listBudgets(workspaceId: string) {
  return tenantPrismaForWorkspace(workspaceId).budgetPolicy.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { reservations: true } },
      reservations: {
        where: { status: "RESERVED" },
        select: { amount: true, currency: true, status: true },
      },
    },
  });
}

export async function getBudget(id: string, workspaceId: string) {
  return tenantPrismaForWorkspace(workspaceId).budgetPolicy.findFirst({
    where: { id, workspaceId },
    include: {
      reservations: { orderBy: { createdAt: "desc" } },
    },
  });
}
