import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getProductById } from "@/server/services/products";
import { ScoreBreakdown } from "@/components/products/score-breakdown";
import { ProductForm, type ProductFormValues } from "@/components/products/product-form";
import { DeleteProductButton } from "@/components/products/delete-product-button";
import { updateProductAction } from "@/server/actions/products";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PRODUCT_STATUS_LABELS, TREND_STATUS_LABELS, RISK_LABELS } from "@/lib/status-labels";
import type { ScoreBreakdownEntry } from "@/features/products/scoring";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  return { title: product?.name ?? "Produkt" };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) notFound();

  const latestScore = product.scores[0];

  const initialValues: ProductFormValues = {
    id: product.id,
    name: product.name,
    description: product.description,
    vendor: product.vendor,
    category: product.category,
    tags: product.tags,
    targetUrl: product.targetUrl,
    imageUrl: product.imageUrl,
    price: product.price ? Number(product.price) : null,
    commissionRate: product.commissionRate ? Number(product.commissionRate) : null,
    audience: product.audience,
    problemSolved: product.problemSolved,
    notes: product.notes,
    status: product.status,
    trend: product.trend,
    risk: product.risk,
    isFavorite: product.isFavorite,
    dimensions: latestScore
      ? {
          demand: latestScore.demand,
          commission: latestScore.commission,
          contentPotential: latestScore.contentPotential,
          competition: latestScore.competition,
          problemSolvingPower: latestScore.problemSolvingPower,
          visualDemonstrability: latestScore.visualDemonstrability,
          platformFit: latestScore.platformFit,
          trendMomentum: latestScore.trendMomentum,
          returnRisk: latestScore.returnRisk,
          complianceRisk: latestScore.complianceRisk,
        }
      : undefined,
  };

  const boundUpdateAction = updateProductAction.bind(null, product.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
            <Badge variant="outline">{PRODUCT_STATUS_LABELS[product.status]}</Badge>
          </div>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {product.category ?? "Ohne Kategorie"} · {product.vendor ?? "Ohne Anbieter"}
          </p>
        </div>
        <DeleteProductButton id={product.id} name={product.name} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="edit">Bearbeiten</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {product.description ? <p>{product.description}</p> : null}
                  <dl className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-xs text-[var(--color-foreground-subtle)]">Preis</dt>
                      <dd>{product.price ? `${Number(product.price).toFixed(2)} €` : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[var(--color-foreground-subtle)]">Provision</dt>
                      <dd>{product.commissionRate ? `${product.commissionRate}%` : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[var(--color-foreground-subtle)]">Trend</dt>
                      <dd>{TREND_STATUS_LABELS[product.trend]}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[var(--color-foreground-subtle)]">Risiko</dt>
                      <dd>{RISK_LABELS[product.risk]}</dd>
                    </div>
                  </dl>
                  {product.targetUrl ? (
                    <Link
                      href={product.targetUrl}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline"
                    >
                      Ziel-Seite öffnen <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  ) : null}
                  {product.audience ? (
                    <div>
                      <p className="text-xs text-[var(--color-foreground-subtle)]">Zielgruppe</p>
                      <p>{product.audience}</p>
                    </div>
                  ) : null}
                  {product.problemSolved ? (
                    <div>
                      <p className="text-xs text-[var(--color-foreground-subtle)]">Gelöstes Problem</p>
                      <p>{product.problemSolved}</p>
                    </div>
                  ) : null}
                  {product.notes ? (
                    <div>
                      <p className="text-xs text-[var(--color-foreground-subtle)]">Notizen</p>
                      <p>{product.notes}</p>
                    </div>
                  ) : null}
                  {product.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {product.tags.map((tag) => (
                        <Badge key={tag} variant="default">{tag}</Badge>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Verknüpfungen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-[var(--color-foreground-muted)]">
                    {product.affiliateLinks.length} Affiliate-Link(s) · {product.campaigns.length} Kampagne(n)
                  </p>
                  {product.affiliateLinks.slice(0, 5).map((link) => (
                    <div key={link.id} className="flex items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2">
                      <span>{link.label}</span>
                      <Badge variant="outline">{link.program.provider}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Score-Aufschlüsselung</CardTitle>
              </CardHeader>
              <CardContent>
                {latestScore ? (
                  <ScoreBreakdown
                    breakdown={latestScore.breakdown as unknown as ScoreBreakdownEntry[]}
                    total={latestScore.totalScore}
                  />
                ) : (
                  <p className="text-sm text-[var(--color-foreground-muted)]">Noch kein Score berechnet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="edit">
          <ProductForm action={boundUpdateAction} initialValues={initialValues} submitLabel="Änderungen speichern" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
