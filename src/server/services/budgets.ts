import "server-only";
import { prisma } from "@/lib/db/client";

export type CreateBudgetPolicyInput = {
  name: string;
  scope?: string;
  limitAmount: number;
  currency?: string;
  period?: string;
  alertThresholdPct?: number;
  action?: "alert" | "block";
  enabled?: boolean;
};

export async function createBudgetPolicy(
  workspaceId: string,
  input: CreateBudgetPolicyInput,
) {
  return prisma.budgetPolicy.create({
    data: { workspaceId, ...input },
  });
}

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
