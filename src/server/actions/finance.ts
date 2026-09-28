"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { runMutation } from "@/server/actions/action-helpers";
import {
  revenueFormSchema,
  expenseFormSchema,
  taxSettingFormSchema,
  idSchema,
} from "@/lib/validation/finance";
import { ok, fail, newRequestId, type Result } from "@/types/result";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { withWorkspaceTransaction } from "@/lib/db/workspace-transaction";

export async function saveRevenueAction(
  revenueId: string | null,
  _prevState: Result<{ id: string }> | null,
  formData: FormData,
): Promise<Result<{ id: string }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  const workspaceId = await resolveWorkspaceId();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const parsed = revenueFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", requestId, parsed.error.flatten().fieldErrors);
  }

  let revenue;
  try {
    revenue = await withWorkspaceTransaction(workspaceId, async (tx) => {
    const relationChecks = await Promise.all([
      parsed.data.programId ? tx.affiliateProgram.findFirst({ where: { id: parsed.data.programId, workspaceId }, select: { id: true } }) : null,
      parsed.data.productId ? tx.product.findFirst({ where: { id: parsed.data.productId, workspaceId }, select: { id: true } }) : null,
      parsed.data.campaignId ? tx.campaign.findFirst({ where: { id: parsed.data.campaignId, workspaceId }, select: { id: true } }) : null,
    ]);
    if (relationChecks.some((value) => value === null || value === undefined)) throw new Error("RELATED_DATA_NOT_FOUND");
  
    const data = {
      date: new Date(parsed.data.date),
      programId: parsed.data.programId || null,
      productId: parsed.data.productId || null,
      campaignId: parsed.data.campaignId || null,
      workspaceId,
      platform: parsed.data.platform || null,
      grossAmount: parsed.data.grossAmount,
      status: parsed.data.status,
      reference: parsed.data.reference || null,
      notes: parsed.data.notes || null,
    };
  
    let revenue;
    if (revenueId) {
      const existing = await tx.revenue.findFirst({ where: { id: revenueId, workspaceId } });
      if (!existing) throw new Error("REVENUE_NOT_FOUND");
      revenue = await tx.revenue.update({ where: { id: existing.id, workspaceId }, data });
    } else {
      revenue = await tx.revenue.create({ data });
    }
  
      return revenue;
    });
  } catch (error) {
    return fail(error instanceof Error && error.message === "REVENUE_NOT_FOUND" ? "Umsatz nicht gefunden." : "Zugehörige Daten nicht gefunden.", requestId);
  }
  await writeAuditLog({
    action: revenueId ? "revenue.update" : "revenue.create",
    entityType: "Revenue",
    entityId: revenue.id,
    requestId,
    actor: user.email,
  });

  revalidatePath("/app/finance");
  return ok({ id: revenue.id }, requestId);
}

export async function deleteRevenueAction(id: string) {
  const result = await runMutation({
    schema: idSchema,
    input: { id },
    auditAction: "revenue.delete",
    entityType: "Revenue",
    handler: async (input) => {
      const workspaceId = await resolveWorkspaceId();
      const existing = await prisma.revenue.findFirst({ where: { id: input.id, workspaceId } });
      if (!existing) throw new Error("REVENUE_NOT_FOUND");
      await prisma.revenue.delete({ where: { id: existing.id, workspaceId } });
      return { id: input.id };
    },
    entityId: (output) => output.id,
  });
  revalidatePath("/app/finance");
  return result;
}

export async function saveExpenseAction(
  expenseId: string | null,
  _prevState: Result<{ id: string }> | null,
  formData: FormData,
): Promise<Result<{ id: string }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  const workspaceId = await resolveWorkspaceId();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const parsed = expenseFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", requestId, parsed.error.flatten().fieldErrors);
  }

  let expense;
  try {
    expense = await withWorkspaceTransaction(workspaceId, async (tx) => {
    const relationChecks = await Promise.all([
      parsed.data.productId ? tx.product.findFirst({ where: { id: parsed.data.productId, workspaceId }, select: { id: true } }) : null,
      parsed.data.campaignId ? tx.campaign.findFirst({ where: { id: parsed.data.campaignId, workspaceId }, select: { id: true } }) : null,
    ]);
    if (relationChecks.some((value) => value === null || value === undefined)) throw new Error("RELATED_DATA_NOT_FOUND");
  
    const data = {
      date: new Date(parsed.data.date),
      workspaceId,
      category: parsed.data.category,
      vendor: parsed.data.vendor || null,
      campaignId: parsed.data.campaignId || null,
      productId: parsed.data.productId || null,
      amount: parsed.data.amount,
      isRecurring: parsed.data.isRecurring ?? false,
      isTaxRelevant: parsed.data.isTaxRelevant ?? true,
      notes: parsed.data.notes || null,
    };
  
    let expense;
    if (expenseId) {
      const existing = await tx.expense.findFirst({ where: { id: expenseId, workspaceId } });
      if (!existing) throw new Error("EXPENSE_NOT_FOUND");
      expense = await tx.expense.update({ where: { id: existing.id, workspaceId }, data });
    } else {
      expense = await tx.expense.create({ data });
    }
  
      return expense;
    });
  } catch (error) {
    return fail(error instanceof Error && error.message === "EXPENSE_NOT_FOUND" ? "Ausgabe nicht gefunden." : "Zugehörige Daten nicht gefunden.", requestId);
  }
  await writeAuditLog({
    action: expenseId ? "expense.update" : "expense.create",
    entityType: "Expense",
    entityId: expense.id,
    requestId,
    actor: user.email,
  });

  revalidatePath("/app/finance");
  return ok({ id: expense.id }, requestId);
}

export async function deleteExpenseAction(id: string) {
  const result = await runMutation({
    schema: idSchema,
    input: { id },
    auditAction: "expense.delete",
    entityType: "Expense",
    handler: async (input) => {
      const workspaceId = await resolveWorkspaceId();
      const existing = await prisma.expense.findFirst({ where: { id: input.id, workspaceId } });
      if (!existing) throw new Error("EXPENSE_NOT_FOUND");
      await prisma.expense.delete({ where: { id: existing.id, workspaceId } });
      return { id: input.id };
    },
    entityId: (output) => output.id,
  });
  revalidatePath("/app/finance");
  return result;
}

export async function saveTaxSettingAction(
  _prevState: Result<{ id: string }> | null,
  formData: FormData,
): Promise<Result<{ id: string }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const parsed = taxSettingFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", requestId, parsed.error.flatten().fieldErrors);
  }

  const workspaceId = await resolveWorkspaceId();
  const setting = await withWorkspaceTransaction(workspaceId, async (tx) => {
    const existing = await tx.taxSetting.findFirst({ where: { workspaceId } });
    const data = {
      workspaceId,
      reserveRatePercent: parsed.data.reserveRatePercent,
      vatRatePercent: parsed.data.vatRatePercent,
      vatEnabled: parsed.data.vatEnabled ?? false,
      tradeTaxReservePercent: parsed.data.tradeTaxReservePercent,
      incomeTaxReservePercent: parsed.data.incomeTaxReservePercent,
    };
  
    const setting = existing
      ? await tx.taxSetting.update({ where: { id: existing.id, workspaceId }, data })
      : await tx.taxSetting.create({ data });
    return setting;
  });

  await writeAuditLog({
    action: "tax_setting.update",
    entityType: "TaxSetting",
    entityId: setting.id,
    requestId,
    actor: user.email,
  });

  revalidatePath("/app/finance");
  return ok({ id: setting.id }, requestId);
}
