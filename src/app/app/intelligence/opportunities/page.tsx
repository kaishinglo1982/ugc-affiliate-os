import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { Prisma, type $Enums } from "@/generated/prisma/client";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ScoreOpportunitiesButton } from "@/components/intelligence/score-opportunities-button";
import { OpportunityActions } from "@/components/intelligence/opportunity-actions";

export const metadata: Metadata = { title: "Opportunity-Board" };

interface OpportunitiesPageProps {
  searchParams: Promise<{ status?: string }>;
}

const OPPORTUNITY_LABELS: Record<string, string> = {
  NEW: "Neu",
  UNDER_REVIEW: "In Prüfung",
  APPROVED: "Freigegeben",
  REJECTED: "Verworfen",
  EXPIRED: "Abgelaufen",
  CONVERTED_TO_CAMPAIGN: "Kampagne",
};

function scoreTone(value: number): "success" | "warning" | "destructive" {
  return value >= 70 ? "success" : value >= 40 ? "warning" : "destructive";
}

function MiniBar({ value }: { value: number }) {
  const tone =
    value >= 70 ? "bg-[var(--color-success)]" : value >= 40 ? "bg-[var(--color-warning)]" : "bg-[var(--color-destructive)]";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-raised)]">
      <div className={`h-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export default async function OpportunitiesPage({ searchParams }: OpportunitiesPageProps) {
  const params = await searchParams;
  const workspaceId = await resolveWorkspaceId();

  const where: Prisma.ProductOpportunityWhereInput = { workspaceId };
  if (params.status) where.status = params.status as $Enums.OpportunityStatus;

  const opportunities = await prisma.productOpportunity.findMany({
    where,
    include: { product: { select: { id: true, canonicalName: true } } },
    orderBy: { totalScore: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Opportunity-Board</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {opportunities.length} Opportunities · nach Total-Score sortiert.
          </p>
        </div>
        <ScoreOpportunitiesButton />
      </div>

      {opportunities.length === 0 ? (
        <EmptyState title="Keine Opportunities" description="Berechne das Scoring neu, um Opportunities zu erzeugen." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {opportunities.map((o) => (
            <Card key={o.id}>
              <CardHeader className="flex-row items-start justify-between">
                <CardTitle className="text-base">{o.product.canonicalName}</CardTitle>
                <Badge variant={scoreTone(o.totalScore)} className="tabular-nums">
                  {o.totalScore}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant={o.status === "APPROVED" ? "success" : o.status === "REJECTED" ? "destructive" : "outline"}>
                  {OPPORTUNITY_LABELS[o.status] ?? o.status}
                </Badge>
                <div className="space-y-1.5">
                  <div>
                    <p className="text-xs text-[var(--color-foreground-subtle)]">Provision</p>
                    <MiniBar value={o.commissionScore} />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-foreground-subtle)]">Nachfrage</p>
                    <MiniBar value={o.demandScore} />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-foreground-subtle)]">Content-Fit</p>
                    <MiniBar value={o.contentFitScore} />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-foreground-subtle)]">Profitabilität</p>
                    <MiniBar value={o.profitabilityScore} />
                  </div>
                </div>
                <OpportunityActions id={o.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
