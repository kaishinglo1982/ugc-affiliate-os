import type { Metadata } from "next";
import Link from "next/link";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCreatorCockpit } from "@/server/services/creator-cockpit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Creator Production Cockpit" };
export const dynamic = "force-dynamic";

function total(values: Record<string, number>) {
  return Object.values(values).reduce((sum, value) => sum + value, 0);
}

export default async function CreatorCockpitPage() {
  const workspaceId = await resolveWorkspaceId();
  const cockpit = await getCreatorCockpit(workspaceId);
  const summary = cockpit.summary;

  const cards = [
    { label: "Kampagnen", value: summary.campaigns, href: "/app/campaigns" },
    { label: "Skripte", value: total(summary.scripts), href: "/app/scripts" },
    { label: "Video-Jobs", value: total(summary.videos), href: "/app/videos" },
    { label: "Social Posts", value: total(summary.posts), href: "/app/publishing" },
    { label: "Aktive Workflows", value: summary.activeWorkflows, href: "/app/workflows" },
    { label: "Aktive Agenten", value: summary.runningAgents, href: "/app/agent-runs" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Creator Production Cockpit
          </h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Live-Sicht auf Content, Produktion, Publishing, Workflows und Agenten.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/app/agents">Agenten steuern</Link>
          </Button>
          <Button asChild>
            <Link href="/app/campaigns/new">Produktion starten</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((item) => (
          <Link key={item.label} href={item.href}>
            <Card className="h-full transition-colors hover:border-[var(--color-primary)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{item.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <StatusCard title="Skripte" values={summary.scripts} />
        <StatusCard title="Video-Jobs" values={summary.videos} />
        <StatusCard title="Publishing" values={summary.posts} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Letzte Workflow-Ausführungen</CardTitle>
        </CardHeader>
        <CardContent>
          {cockpit.recentRuns.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              Noch keine Workflow-Ausführungen.
            </p>
          ) : (
            <div className="space-y-3">
              {cockpit.recentRuns.map((run) => (
                <div
                  key={run.id}
                  className="rounded-md border border-[var(--color-border)] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{run.workflow.name}</p>
                      <p className="text-xs text-[var(--color-foreground-subtle)]">
                        {run.id.slice(0, 8)} ·{" "}
                        {new Date(run.startedAt).toLocaleString("de-DE")}
                      </p>
                    </div>
                    <Badge variant="outline">{run.status}</Badge>
                  </div>
                  {run.steps.some((step) => step.error) ? (
                    <div className="mt-2 text-sm text-[var(--color-danger)]">
                      {run.steps
                        .filter((step) => step.error)
                        .map((step) => step.error)
                        .join(" · ")}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusCard({
  title,
  values,
}: {
  title: string;
  values: Record<string, number>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {Object.keys(values).length === 0 ? (
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Keine Daten.
          </p>
        ) : (
          Object.entries(values).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between">
              <Badge variant="outline">{status}</Badge>
              <span className="font-medium">{count}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
