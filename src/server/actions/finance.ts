"use server";

import { revalidatePath } from "next/cache";
import { withWorkspaceDb } from "@/lib/db/workspace-context";
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

export async function saveRevenueAction(
  revenueId: string | null,
  _prevState: Result<{ id: string }> | null,
  formData: FormData,
): Promise<Result<{ id: string }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const parsed = revenueFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", requestId, parsed.error.flatten().fieldErrors);
  }

  const data = {
    date: new Date(parsed.data.date),
    programId: parsed.data.programId || null,
    productId: parsed.data.productId || null,
    campaignId: parsed.data.campaignId || null,
    platform: parsed.data.platform || null,
    grossAmount: parsed.data.grossAmount,
    status: parsed.data.status,
    reference: parsed.data.reference || null,
    notes: parsed.data.notes || null,
  };

  const revenue = await withWorkspaceDb(async (tx) => {
    if (revenueId) {
      const visible = await tx.revenue.findUnique({ where: { id: revenueId }, select: { id: true } });
      if (!visible) return null;
      return tx.revenue.update({ where: { id: revenueId }, data });
    }
    return tx.revenue.create({ data });
  });

  if (!revenue) return fail("Einnahme nicht gefunden.", requestId);

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
    handler: async (input) =>
      withWorkspaceDb(async (tx) => {
        await tx.revenue.delete({ where: { id: input.id } });
        return { id: input.id };
      }),
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
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const parsed = expenseFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", requestId, parsed.error.flatten().fieldErrors);
  }

  const data = {
    date: new Date(parsed.data.date),
    category: parsed.data.category,
    vendor: parsed.data.vendor || null,
    campaignId: parsed.data.campaignId || null,
    productId: parsed.data.productId || null,
    amount: parsed.data.amount,
    isRecurring: parsed.data.isRecurring ?? false,
    isTaxRelevant: parsed.data.isTaxRelevant ?? true,
    notes: parsed.data.notes || null,
  };

  const expense = await withWorkspaceDb(async (tx) => {
    if (expenseId) {
      const visible = await tx.expense.findUnique({ where: { id: expenseId }, select: { id: true } });
      if (!visible) return null;
      return tx.expense.update({ where: { id: expenseId }, data });
    }
    return tx.expense.create({ data });
  });

  if (!expense) return fail("Ausgabe nicht gefunden.", requestId);

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
    handler: async (input) =>
      withWorkspaceDb(async (tx) => {
        await tx.expense.delete({ where: { id: input.id } });
        return { id: input.id };
      }),
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

  const data = {
    reserveRatePercent: parsed.data.reserveRatePercent,
    vatRatePercent: parsed.data.vatRatePercent,
    vatEnabled: parsed.data.vatEnabled ?? false,
    tradeTaxReservePercent: parsed.data.tradeTaxReservePercent,
    incomeTaxReservePercent: parsed.data.incomeTaxReservePercent,
  };

  const setting = await withWorkspaceDb(async (tx) => {
    const existing = await tx.taxSetting.findFirst();
    return existing
      ? tx.taxSetting.update({ where: { id: existing.id }, data })
      : tx.taxSetting.create({ data });
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
