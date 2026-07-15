import "server-only";
import { prisma } from "@/lib/db/client";

export async function listBudgets(workspaceId: string) {
  return prisma.budgetPolicy.findMany({
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
  return prisma.budgetPolicy.findFirst({
    where: { id, workspaceId },
    include: {
      reservations: { orderBy: { createdAt: "desc" } },
    },
  });
}
