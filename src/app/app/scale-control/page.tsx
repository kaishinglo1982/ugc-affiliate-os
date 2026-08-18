import type { Metadata } from "next";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { evaluateScaleReadiness } from "@/server/services/phase31-40";
import { Badge } from "@/components/ui/badge";
import { ScaleControlActions } from "./scale-control-actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Enterprise Scale Control" };
export const dynamic = "force-dynamic";

export default async function ScaleControlPage() {
  const workspaceId = await resolveWorkspaceId();
  const readiness = await evaluateScaleReadiness(workspaceId);
  const regions = new Map<string, typeof readiness.gates>();

  for (const gate of readiness.gates) {
    const existing = regions.get(gate.regionCode) ?? [];
    existing.push(gate);
    regions.set(gate.regionCode, existing);
  }

  const summary = [
    { label: "Phase-30-Blocker", value: readiness.phase30Blocking },
    { label: "Scale-Blocker", value: readiness.scaleBlocking },
    { label: "Aktive Kill Switches", value: readiness.activeKillSwitches },
    { label: "Kritische Incidents", value: readiness.criticalIncidents },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Enterprise Scale Control
          </h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Evidenzbasierte Go/No-Go-Sicht für Phase 30 und regionale Phase 40.
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            readiness.ready
              ? "border-emerald-500 text-emerald-600"
              : "border-red-500 text-red-600"
          }
        >
          {readiness.ready ? "READY" : "NO-GO"}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <ScaleControlActions />

      {regions.size === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Scale-Gates noch nicht initialisiert</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[var(--color-foreground-muted)]">
            <p>
              Der Workspace bleibt sicher auf NO-GO, bis Phase-30- und regionale
              Phase-40-Gates angelegt und mit realer Evidenz geprüft wurden.
            </p>
            <p>
              Initialisierung erfolgt über die Aktion
              <code className="mx-1 rounded bg-[var(--color-background-subtle)] px-1 py-0.5">
                initialize_readiness_gates
              </code>
              an <code>/api/scale-control</code>.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {[...regions.entries()].map(([regionCode, gates]) => {
            const blocking = gates.filter(
              (gate) => gate.required && ["PENDING", "FAIL"].includes(gate.status),
            ).length;
            return (
              <Card key={regionCode}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>Region {regionCode}</CardTitle>
                    <Badge variant="outline">
                      {blocking === 0 ? "REGION READY" : `${blocking} BLOCKER`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {gates.map((gate) => (
                    <div
                      key={gate.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-[var(--color-border)] p-3"
                    >
                      <div>
                        <p className="font-medium">{gate.gateKey}</p>
                        <p className="text-xs text-[var(--color-foreground-subtle)]">
                          {gate.required ? "Pflichtgate" : "Optional"}
                          {gate.checkedAt
                            ? ` · geprüft ${new Date(gate.checkedAt).toLocaleString("de-DE")}`
                            : " · noch nicht geprüft"}
                        </p>
                        {gate.notes ? (
                          <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
                            {gate.notes}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{gate.status}</Badge>
                        <p className="mt-1 max-w-72 truncate text-xs text-[var(--color-foreground-subtle)]">
                          {gate.evidenceReference ?? "Keine Evidenz"}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Freigaberegel</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[var(--color-foreground-muted)]">
          READY wird nur erreicht, wenn Phase-30- und Phase-40-Gates existieren,
          alle Pflichtgates PASS oder evidenzbasiert WAIVED sind, kein Kill Switch
          aktiv ist und kein offener SEV1-/SEV2-Incident besteht.
        </CardContent>
      </Card>
    </div>
  );
}
