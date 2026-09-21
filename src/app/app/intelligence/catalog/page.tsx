import type { Metadata } from "next";
import { tenantPrismaForWorkspace } from "@/lib/db/tenant-client";
import { Prisma, type $Enums } from "@/generated/prisma/client";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CatalogTable, type CatalogRow } from "@/components/intelligence/catalog-table";
import { CatalogFilters } from "@/components/intelligence/catalog-filters";

export const metadata: Metadata = { title: "Produkt-Katalog" };

interface CatalogPageProps {
  searchParams: Promise<{ status?: string; q?: string }>;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const workspaceId = await resolveWorkspaceId();

  const where: Prisma.ProductWhereInput = { workspaceId };
  if (params.status) where.status = params.status as $Enums.ProductStatus;
  if (params.q) {
    where.OR = [
      { canonicalName: { contains: params.q } },
      { brandName: { contains: params.q } },
    ];
  }

  const products = await tenantPrismaForWorkspace(workspaceId).product.findMany({
    where,
    include: {
      complianceProfiles: { orderBy: { evaluatedAt: "desc" }, take: 1 },
      opportunities: { orderBy: { calculatedAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows: CatalogRow[] = products.map((p) => ({
    id: p.id,
    name: p.canonicalName,
    brandName: p.brandName,
    status: p.status,
    riskLevel: p.riskLevel,
    opportunityScore: p.opportunities[0]?.totalScore ?? null,
    complianceStatus: p.complianceProfiles[0]?.status ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Produkt-Katalog</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {rows.length} Produkt{rows.length === 1 ? "" : "e"} · Bulk-Aktionen über die Auswahl.
        </p>
      </div>

      <CatalogFilters status={params.status} q={params.q} />

      <Card>
        <CardContent className="pt-5">
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--color-foreground-muted)]">
              Keine Produkte gefunden.
            </p>
          ) : (
            <CatalogTable products={rows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
