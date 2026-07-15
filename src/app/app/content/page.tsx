import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Quote, Clapperboard, Image as ImageIcon, ShieldCheck } from "lucide-react";
import { contentOverview } from "@/server/services/content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CONTENT_BRIEF_STATUS_LABELS } from "@/lib/status-labels";

export const metadata: Metadata = { title: "Content Studio" };

export default async function ContentOverviewPage() {
  const overview = await contentOverview();

  const stats = [
    { label: "Briefe", value: overview.briefs, href: "/app/content/briefs", icon: FileText },
    { label: "Hooks", value: overview.hooks, href: "/app/content/hooks", icon: Quote },
    { label: "Skripte", value: overview.scripts, href: "/app/scripts", icon: Clapperboard },
    { label: "Assets", value: overview.assets, href: "/app/media", icon: ImageIcon },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Content Studio</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Planung, Produktion und Governance von UGC-Inhalten.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-colors hover:bg-[var(--color-surface-raised)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
                <s.icon className="h-4 w-4 text-[var(--color-foreground-subtle)]" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{s.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schnellaktionen</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/app/content/briefs">Brief erstellen</Link></Button>
          <Button asChild variant="outline"><Link href="/app/content/hooks">Hook erstellen</Link></Button>
          <Button asChild variant="outline"><Link href="/app/scripts">Skript öffnen</Link></Button>
          <Button asChild variant="outline"><Link href="/app/approvals"><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Offene Freigaben</span></Link></Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Zuletzt bearbeitete Briefe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overview.recent.length === 0 ? (
              <p className="text-sm text-[var(--color-foreground-subtle)]">Noch keine Briefe.</p>
            ) : (
              overview.recent.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{b.objective.slice(0, 60)}</span>
                  <span className="text-[var(--color-foreground-subtle)]">
                    {CONTENT_BRIEF_STATUS_LABELS[b.status] ?? b.status}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Briefe nach Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overview.byStatus.length === 0 ? (
              <p className="text-sm text-[var(--color-foreground-subtle)]">Keine Daten.</p>
            ) : (
              overview.byStatus.map((g) => (
                <div key={g.status} className="flex items-center justify-between text-sm">
                  <span>{CONTENT_BRIEF_STATUS_LABELS[g.status] ?? g.status}</span>
                  <span className="font-medium">{g._count._all}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
