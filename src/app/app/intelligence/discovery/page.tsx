import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listQueries, listRuns } from "@/features/products/application/query-service";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { NewQueryForm } from "@/components/intelligence/new-query-form";
import { RunQueryButton } from "@/components/intelligence/run-query-button";

export const metadata: Metadata = { title: "Produkt-Discovery" };

interface DiscoveryQuery {
  id: string;
  name: string;
  keywords: string[];
  providerIds: string[];
  status: string;
  targetCountryCodes: string[];
}

interface DiscoveryRun {
  id: string;
  queryId: string;
  status: string;
  providerCount: number;
  discoveredOfferCount: number;
  newProductCount: number;
  createdAt: Date | string;
}

const QUERY_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Entwurf",
  ACTIVE: "Aktiv",
  PAUSED: "Pausiert",
  ARCHIVED: "Archiviert",
};

const RUN_STATUS_LABELS: Record<string, string> = {
  QUEUED: "Warteschlange",
  RUNNING: "Läuft",
  COMPLETED: "Abgeschlossen",
  FAILED: "Fehlgeschlagen",
  PARTIALLY_COMPLETED: "Teilweise",
};

const RUN_VARIANT: Record<string, "default" | "success" | "warning" | "destructive"> = {
  COMPLETED: "success",
  PARTIALLY_COMPLETED: "warning",
  FAILED: "destructive",
};

export default async function DiscoveryPage() {
  const workspaceId = await resolveWorkspaceId();
  const [queries, runs] = await Promise.all([
    listQueries(workspaceId) as Promise<DiscoveryQuery[]>,
    listRuns(workspaceId) as Promise<DiscoveryRun[]>,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Produkt-Discovery</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Queries definieren und Discovery-Jobs ausführen.
        </p>
      </div>

      <Tabs defaultValue="queries">
        <TabsList>
          <TabsTrigger value="queries">Queries</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
        </TabsList>

        <TabsContent value="queries">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{queries.length} Queries</CardTitle>
              </CardHeader>
              <CardContent>
                {queries.length === 0 ? (
                  <EmptyState title="Noch keine Queries" description="Lege eine neue Discovery-Query an." />
                ) : (
                  <div className="space-y-3">
                    {queries.map((q) => (
                      <div
                        key={q.id}
                        className="flex flex-col gap-2 rounded-md border border-[var(--color-border)] p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{q.name}</span>
                            <Badge variant="outline">{QUERY_STATUS_LABELS[q.status] ?? q.status}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-[var(--color-foreground-muted)]">
                            {q.keywords.length} Keywords · {q.providerIds.length || "alle"} Provider ·{" "}
                            {q.targetCountryCodes.join(", ") || "DE"}
                          </p>
                        </div>
                        <RunQueryButton id={q.id} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <NewQueryForm />
          </div>
        </TabsContent>

        <TabsContent value="runs">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{runs.length} Runs</CardTitle>
            </CardHeader>
            <CardContent>
              {runs.length === 0 ? (
                <EmptyState title="Noch keine Runs" description="Führe eine Query aus, um Discovery zu starten." />
              ) : (
                <div className="space-y-3">
                  {runs.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-col gap-1 rounded-md border border-[var(--color-border)] p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-[var(--color-foreground-muted)]">
                          {r.id.slice(0, 8)}
                        </span>
                        <Badge variant={RUN_VARIANT[r.status] ?? "default"}>
                          {RUN_STATUS_LABELS[r.status] ?? r.status}
                        </Badge>
                      </div>
                      <p className="text-sm">
                        {r.providerCount} Provider · {r.discoveredOfferCount} Angebote · {r.newProductCount} neu
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
