import type { Metadata } from "next";
import { listApprovals } from "@/server/services/approvals";
import { ApprovalsView, type ApprovalRow } from "@/components/approvals/approvals-view";

export const metadata: Metadata = { title: "Freigaben" };

export default async function ApprovalsPage() {
  const approvals = await listApprovals();

  const rows: ApprovalRow[] = approvals.map((a) => ({
    id: a.id,
    resourceType: a.resourceType,
    resourceId: a.resourceId,
    status: a.status,
    cost: a.cost != null ? Number(a.cost) : null,
    currency: a.currency ?? null,
    expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Freigaben</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Genehmigungen für Agentenaktionen, Kosten und sensible Operationen.
        </p>
      </div>
      <ApprovalsView approvals={rows} />
    </div>
  );
}
