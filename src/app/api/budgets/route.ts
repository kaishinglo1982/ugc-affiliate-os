import { z } from "zod";
import {
  created,
  ok,
  parseBody,
  withApiContext,
} from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit/log";
import {
  createBudgetPolicy,
  listBudgets,
} from "@/server/services/budgets";

export const dynamic = "force-dynamic";

const currencySchema = z.string().trim().length(3).transform((value) => value.toUpperCase());

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  scope: z.string().trim().min(1).max(50).optional(),
  limitAmount: z.number().finite().positive(),
  currency: currencySchema.optional(),
  period: z.string().trim().min(1).max(20).optional(),
  alertThresholdPct: z.number().int().min(1).max(100).optional(),
  action: z.enum(["alert", "block"]).optional(),
  enabled: z.boolean().optional(),
});

export async function GET() {
  const auth = await withApiContext(Permission.VIEW_BUDGETS);
  if ("response" in auth) return auth.response;

  const policies = await listBudgets(auth.context.workspaceId);
  return ok({ policies });
}

export async function POST(request: Request) {
  const auth = await withApiContext(Permission.MANAGE_BUDGETS);
  if ("response" in auth) return auth.response;

  const validated = await parseBody(request, createSchema);
  if ("response" in validated) return validated.response;

  const policy = await createBudgetPolicy(
    auth.context.workspaceId,
    validated.data,
  );

  await writeAuditLog({
    action: "budget_policy.create",
    entityType: "BudgetPolicy",
    entityId: policy.id,
    actor: auth.context.actor,
  });

  return created({ policy });
}
