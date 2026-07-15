import type { Metadata } from "next";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { listBudgets } from "@/server/services/budgets";
import { BudgetsView, type PolicyRow } from "@/components/budgets/budgets-view";

export const metadata: Metadata = { title: "Budgets" };

export default async function BudgetsPage() {
  const workspaceId = await resolveWorkspaceId();
  const policies = await listBudgets(workspaceId);

  const rows: PolicyRow[] = policies.map((p) => ({
    id: p.id,
    name: p.name,
    scope: p.scope,
    currency: p.currency,
    limitAmount: Number(p.limitAmount),
    period: p.period,
    action: p.action,
    enabled: p.enabled,
    reservationCount: p._count.reservations,
    reservedAmount: p.reservations.reduce((sum, r) => sum + Number(r.amount), 0),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Budget-Policies und Kostenreservierungen (Quotas/Ausgaben).
        </p>
      </div>
      <BudgetsView policies={rows} />
    </div>
  );
}
