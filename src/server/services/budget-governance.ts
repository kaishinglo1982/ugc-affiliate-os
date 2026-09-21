import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { tenantPrismaForWorkspace } from "@/lib/db/tenant-client";

export type BudgetReservationInput = {
  workspaceId: string;
  policyId: string;
  ownerType: string;
  ownerId: string;
  amount: Prisma.Decimal | number;
  currency?: string;
  idempotencyKey: string;
  expiresAt?: Date | null;
};

function periodStart(period: string, now: Date): Date | null {
  if (period === "lifetime") return null;
  if (period === "daily") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  if (period === "monthly") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  throw new Error("BUDGET_PERIOD_UNSUPPORTED");
}

export async function reserveBudget(input: BudgetReservationInput) {
  const db = tenantPrismaForWorkspace(input.workspaceId);
  const amount = new Prisma.Decimal(input.amount);
  if (amount.lte(0)) throw new Error("BUDGET_AMOUNT_INVALID");

  return db.$transaction(async (tx) => {
    const existing = await tx.costReservation.findFirst({
      where: { workspaceId: input.workspaceId, idempotencyKey: input.idempotencyKey },
    });
    if (existing) return existing;

    const policy = await tx.budgetPolicy.findFirst({
      where: { id: input.policyId, workspaceId: input.workspaceId, enabled: true },
    });
    if (!policy) throw new Error("BUDGET_POLICY_NOT_FOUND");
    if (policy.currency !== (input.currency ?? "EUR")) throw new Error("BUDGET_CURRENCY_MISMATCH");

    const start = periodStart(policy.period, new Date());
    const spent = await tx.costReservation.aggregate({
      _sum: { amount: true },
      where: {
        workspaceId: input.workspaceId,
        policyId: policy.id,
        currency: policy.currency,
        status: { in: ["RESERVED", "CONSUMED"] },
        ...(start ? { createdAt: { gte: start } } : {}),
      },
    });

    const current = spent._sum.amount ?? new Prisma.Decimal(0);
    if (current.plus(amount).gt(policy.limitAmount)) throw new Error("BUDGET_EXCEEDED");

    return tx.costReservation.create({
      data: {
        workspaceId: input.workspaceId,
        policyId: policy.id,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        amount,
        currency: policy.currency,
        status: "RESERVED",
        expiresAt: input.expiresAt ?? null,
        idempotencyKey: input.idempotencyKey,
      },
    });
  });
}

export async function consumeBudgetReservation(id: string, workspaceId: string) {
  const db = tenantPrismaForWorkspace(workspaceId);
  const result = await db.costReservation.updateMany({
    where: { id, workspaceId, status: "RESERVED" },
    data: { status: "CONSUMED" },
  });
  if (result.count !== 1) throw new Error("BUDGET_RESERVATION_NOT_CONSUMABLE");
  return db.costReservation.findFirstOrThrow({ where: { id, workspaceId } });
}

export async function releaseBudgetReservation(id: string, workspaceId: string) {
  const db = tenantPrismaForWorkspace(workspaceId);
  const result = await db.costReservation.updateMany({
    where: { id, workspaceId, status: "RESERVED" },
    data: { status: "RELEASED" },
  });
  if (result.count !== 1) throw new Error("BUDGET_RESERVATION_NOT_RELEASEABLE");
  return db.costReservation.findFirstOrThrow({ where: { id, workspaceId } });
}

export async function expireBudgetReservations(workspaceId: string, now = new Date()) {
  return tenantPrismaForWorkspace(workspaceId).costReservation.updateMany({
    where: {
      workspaceId,
      status: "RESERVED",
      expiresAt: { lte: now },
    },
    data: { status: "EXPIRED" },
  });
}
