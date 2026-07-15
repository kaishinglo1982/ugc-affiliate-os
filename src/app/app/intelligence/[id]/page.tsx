import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { PRODUCT_STATUS_LABELS, RISK_LABELS, AFFILIATE_PROVIDER_LABELS } from "@/lib/status-labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ReevaluateComplianceButton } from "@/components/intelligence/revaluate-compliance-button";
import { MatchActions } from "@/components/intelligence/match-actions";

export const metadata: Metadata = { title: "Produkt-Detail" };

interface DetailPageProps {
  params: Promise<{ id: string }>;
}

const COMPLIANCE_LABELS: Record<string, string> = {
  PASSED: "Bestanden",
  FAILED: "Durchgefallen",
  MANUAL_REVIEW: "Manuell prüfen",
  PENDING: "Ausstehend",
};

const OPPORTUNITY_LABELS: Record<string, string> = {
  NEW: "Neu",
  UNDER_REVIEW: "In Prüfung",
  APPROVED: "Freigegeben",
  REJECTED: "Verworfen",
  EXPIRED: "Abgelaufen",
  CONVERTED_TO_CAMPAIGN: "Kampagne",
};

function num(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("de-DE");
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const tone =
    value >= 70 ? "bg-[var(--color-success)]" : value >= 40 ? "bg-[var(--color-warning)]" : "bg-[var(--color-destructive)]";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[var(--color-foreground-muted)]">{label}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-raised)]">
        <div className={`h-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export default async function ProductDetailPage({ params }: DetailPageProps) {
  const { id } = await params;
  const workspaceId = await resolveWorkspaceId();

  const product = await prisma.product.findFirst({
    where: { id, workspaceId },
    include: {
      category: true,
      offers: { include: { affiliateProgram: true } },
      complianceProfiles: { orderBy: { evaluatedAt: "desc" }, take: 1 },
      contentFitProfiles: { orderBy: { generatedAt: "desc" }, take: 1 },
      profitabilityEstimates: { orderBy: { generatedAt: "desc" }, take: 1 },
      opportunities: { orderBy: { calculatedAt: "desc" }, take: 1 },
      matchCandidates: {
        where: { status: "PENDING" },
        include: { sourceOffer: true, candidateProduct: true },
      },
    },
  });

  if (!product) notFound();

  const compliance = product.complianceProfiles[0];
  const fit = product.contentFitProfiles[0];
  const profit = product.profitabilityEstimates[0];
  const opportunity = product.opportunities[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{product.canonicalName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{PRODUCT_STATUS_LABELS[product.status] ?? product.status}</Badge>
            <Badge variant={product.riskLevel === "HIGH" || product.riskLevel === "CRITICAL" ? "destructive" : "warning"}>
              {RISK_LABELS[product.riskLevel] ?? product.riskLevel}
            </Badge>
            {product.brandName ? (
              <span className="text-sm text-[var(--color-foreground-muted)]">{product.brandName}</span>
            ) : null}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Überblick</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="contentfit">Content-Fit</TabsTrigger>
          <TabsTrigger value="profitability">Profitabilität</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Überblick</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-[var(--color-foreground-muted)]">
                {product.description ?? "Keine Beschreibung."}
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs uppercase text-[var(--color-foreground-subtle)]">Preis</p>
                  <p className="tabular-nums">{num(product.price)} {product.currency}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-[var(--color-foreground-subtle)]">Kategorie</p>
                  <p>{product.category?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-[var(--color-foreground-subtle)]">Marke</p>
                  <p>{product.brandName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-[var(--color-foreground-subtle)]">Sprache</p>
                  <p>{product.languageCode}</p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Affiliate-Angebote</p>
                {product.offers.length === 0 ? (
                  <p className="text-sm text-[var(--color-foreground-muted)]">Keine Angebote.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Preis</TableHead>
                        <TableHead>Provision</TableHead>
                        <TableHead>Verfügbarkeit</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {product.offers.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell>{AFFILIATE_PROVIDER_LABELS[o.provider] ?? o.provider}</TableCell>
                          <TableCell className="tabular-nums">
                            {num(o.priceAmount)} {o.currency ?? ""}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {o.commissionRate !== null ? `${Number(o.commissionRate)}%` : "—"}
                          </TableCell>
                          <TableCell>{o.availability}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{o.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Compliance</CardTitle>
              <ReevaluateComplianceButton productId={product.id} />
            </CardHeader>
            <CardContent className="space-y-3">
              {compliance ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={compliance.status === "PASSED" ? "success" : compliance.status === "FAILED" ? "destructive" : "warning"}>
                      {COMPLIANCE_LABELS[compliance.status] ?? compliance.status}
                    </Badge>
                    <Badge variant={compliance.riskLevel === "HIGH" || compliance.riskLevel === "CRITICAL" ? "destructive" : "warning"}>
                      {RISK_LABELS[compliance.riskLevel] ?? compliance.riskLevel}
                    </Badge>
                    {compliance.manualReviewRequired ? <Badge variant="warning">Manuelle Prüfung</Badge> : null}
                    {compliance.disclosureRequired ? <Badge variant="outline">Hinweispflicht</Badge> : null}
                  </div>
                  {compliance.reasons.length > 0 ? (
                    <ul className="list-inside list-disc text-sm text-[var(--color-foreground-muted)]">
                      {compliance.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[var(--color-foreground-muted)]">Keine Auffälligkeiten.</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-[var(--color-foreground-muted)]">Noch nicht ausgewertet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contentfit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content-Fit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fit ? (
                <>
                  <div className="space-y-2">
                    <ScoreBar label="Demonstrierbarkeit" value={fit.demonstrabilityScore} />
                    <ScoreBar label="Visuelle Attraktivität" value={fit.visualAppealScore} />
                    <ScoreBar label="Problem-Lösung" value={fit.problemSolutionFitScore} />
                    <ScoreBar label="Testimonial" value={fit.testimonialFitScore} />
                    <ScoreBar label="Tutorial" value={fit.tutorialFitScore} />
                    <ScoreBar label="Short-Video" value={fit.shortVideoFitScore} />
                  </div>
                  <div className="text-sm">
                    <p className="text-xs uppercase text-[var(--color-foreground-subtle)]">Empfohlene Hooks</p>
                    <p className="text-[var(--color-foreground-muted)]">{fit.recommendedHookTypes.join(", ") || "—"}</p>
                    <p className="mt-2 text-xs uppercase text-[var(--color-foreground-subtle)]">Script-Strukturen</p>
                    <p className="text-[var(--color-foreground-muted)]">{fit.recommendedScriptStructures.join(", ") || "—"}</p>
                    <p className="mt-2 text-xs uppercase text-[var(--color-foreground-subtle)]">Formate</p>
                    <p className="text-[var(--color-foreground-muted)]">{fit.recommendedContentFormats.join(", ") || "—"}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[var(--color-foreground-muted)]">Noch nicht analysiert.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profitability">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profitabilität</CardTitle>
            </CardHeader>
            <CardContent>
              {profit ? (
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase text-[var(--color-foreground-subtle)]">Provision / Conversion</p>
                    <p className="tabular-nums">{num(profit.estimatedCommissionPerConversion)} {profit.currency}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-[var(--color-foreground-subtle)]">Umsatz / Post</p>
                    <p className="tabular-nums">{num(profit.estimatedRevenuePerPost)} {profit.currency}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-[var(--color-foreground-subtle)]">Netto / Post</p>
                    <p className="tabular-nums">{num(profit.estimatedNetRevenuePerPost)} {profit.currency}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-[var(--color-foreground-subtle)]">Untergrenze</p>
                    <p className="tabular-nums">{num(profit.lowerBound)} {profit.currency}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-[var(--color-foreground-subtle)]">Obergrenze</p>
                    <p className="tabular-nums">{num(profit.upperBound)} {profit.currency}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-[var(--color-foreground-subtle)]">Konfidenz</p>
                    <p className="tabular-nums">{num(profit.confidenceScore)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--color-foreground-muted)]">Noch nicht geschätzt.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Opportunity-Scoring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {opportunity ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-semibold tabular-nums">{opportunity.totalScore}</span>
                    <Badge variant={opportunity.status === "APPROVED" ? "success" : opportunity.status === "REJECTED" ? "destructive" : "outline"}>
                      {OPPORTUNITY_LABELS[opportunity.status] ?? opportunity.status}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <ScoreBar label="Provision" value={opportunity.commissionScore} />
                    <ScoreBar label="Nachfrage" value={opportunity.demandScore} />
                    <ScoreBar label="Wettbewerb" value={opportunity.competitionScore} />
                    <ScoreBar label="Content-Fit" value={opportunity.contentFitScore} />
                    <ScoreBar label="Audience-Fit" value={opportunity.audienceFitScore} />
                    <ScoreBar label="Trend" value={opportunity.trendScore} />
                    <ScoreBar label="Profitabilität" value={opportunity.profitabilityScore} />
                    <ScoreBar label="Datenqualität" value={opportunity.dataQualityScore} />
                    <ScoreBar label="Compliance" value={opportunity.complianceScore} />
                  </div>
                  {opportunity.explanation ? (
                    <p className="text-sm text-[var(--color-foreground-muted)]">{opportunity.explanation}</p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-[var(--color-foreground-muted)]">Noch nicht bewertet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matches">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Match-Kandidaten</CardTitle>
            </CardHeader>
            <CardContent>
              {product.matchCandidates.length === 0 ? (
                <p className="text-sm text-[var(--color-foreground-muted)]">Keine offenen Matches.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Angebot</TableHead>
                      <TableHead>Kandidat</TableHead>
                      <TableHead>Methode</TableHead>
                      <TableHead>Konfidenz</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.matchCandidates.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{m.sourceOffer.title}</TableCell>
                        <TableCell>{m.candidateProduct.canonicalName}</TableCell>
                        <TableCell>{m.matchMethod}</TableCell>
                        <TableCell className="tabular-nums">{num(m.confidenceScore)}</TableCell>
                        <TableCell>
                          <MatchActions id={m.id} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
