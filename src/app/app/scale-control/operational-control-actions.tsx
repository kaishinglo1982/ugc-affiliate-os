"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

async function post(endpoint: string, body: unknown) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Aktion fehlgeschlagen (${response.status})`);
  }
}

export function OperationalControlActions() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  const [scopeType, setScopeType] = useState("GLOBAL");
  const [scopeId, setScopeId] = useState("");
  const [reason, setReason] = useState("");
  const [releaseId, setReleaseId] = useState("");
  const [incidentTitle, setIncidentTitle] = useState("");
  const [severity, setSeverity] = useState("SEV2");
  const [runbookReference, setRunbookReference] = useState("");
  const [incidentSummary, setIncidentSummary] = useState("");
  const [resolveId, setResolveId] = useState("");
  const [recoveryEvidence, setRecoveryEvidence] = useState("");

  const run = (endpoint: string, body: unknown, success: string) => {
    setMessage(undefined);
    startTransition(async () => {
      try {
        await post(endpoint, body);
        setMessage(success);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unbekannter Fehler");
      }
    });
  };

  const activateKillSwitch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    run(
      "/api/executive-control",
      {
        action: "activate_kill_switch",
        payload: {
          scopeType,
          scopeId: scopeId.trim() || undefined,
          reason,
        },
      },
      "Kill Switch wurde aktiviert und auditiert.",
    );
  };

  const releaseKillSwitch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    run(
      "/api/executive-control",
      { action: "release_kill_switch", payload: { id: releaseId } },
      "Kill Switch wurde freigegeben und auditiert.",
    );
  };

  const openIncident = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    run(
      "/api/scale-control",
      {
        action: "open_incident",
        payload: {
          title: incidentTitle,
          severity,
          scopeType,
          scopeId: scopeId.trim() || undefined,
          runbookReference,
          summary: incidentSummary,
        },
      },
      "Reliability Incident wurde geöffnet.",
    );
  };

  const resolveIncident = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    run(
      "/api/scale-control",
      {
        action: "resolve_incident",
        payload: {
          id: resolveId,
          evidenceReference: recoveryEvidence,
        },
      },
      "Incident wurde mit Recovery-Evidenz gelöst.",
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Operative Notfallsteuerung</h2>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kill Switch aktivieren</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={activateKillSwitch}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  aria-label="Scope-Typ"
                  value={scopeType}
                  onChange={(event) => setScopeType(event.target.value)}
                  placeholder="GLOBAL"
                  disabled={pending}
                  required
                />
                <Input
                  aria-label="Optionale Scope-ID"
                  value={scopeId}
                  onChange={(event) => setScopeId(event.target.value)}
                  placeholder="Optionale Scope-ID"
                  disabled={pending}
                />
              </div>
              <Textarea
                aria-label="Kill-Switch-Grund"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Konkreter Aktivierungsgrund"
                disabled={pending}
                required
              />
              <Button type="submit" variant="destructive" disabled={pending}>
                Kill Switch aktivieren
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kill Switch freigeben</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={releaseKillSwitch}>
              <Input
                aria-label="Kill-Switch-ID"
                value={releaseId}
                onChange={(event) => setReleaseId(event.target.value)}
                placeholder="UUID des aktiven Kill Switches"
                disabled={pending}
                required
              />
              <Button type="submit" variant="outline" disabled={pending}>
                Kill Switch freigeben
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incident öffnen</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={openIncident}>
              <Input
                aria-label="Incident-Titel"
                value={incidentTitle}
                onChange={(event) => setIncidentTitle(event.target.value)}
                placeholder="Incident-Titel"
                disabled={pending}
                required
              />
              <select
                aria-label="Severity"
                value={severity}
                onChange={(event) => setSeverity(event.target.value)}
                className="h-11 w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm"
                disabled={pending}
              >
                <option value="SEV1">SEV1</option>
                <option value="SEV2">SEV2</option>
                <option value="SEV3">SEV3</option>
                <option value="SEV4">SEV4</option>
              </select>
              <Input
                aria-label="Runbook Reference"
                value={runbookReference}
                onChange={(event) => setRunbookReference(event.target.value)}
                placeholder="runbook://..."
                disabled={pending}
                required
              />
              <Textarea
                aria-label="Incident-Zusammenfassung"
                value={incidentSummary}
                onChange={(event) => setIncidentSummary(event.target.value)}
                placeholder="Auswirkung, Scope und erste Diagnose"
                disabled={pending}
                required
              />
              <Button type="submit" disabled={pending}>
                Incident öffnen
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incident evidenzbasiert lösen</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={resolveIncident}>
              <Input
                aria-label="Incident-ID"
                value={resolveId}
                onChange={(event) => setResolveId(event.target.value)}
                placeholder="UUID des Incidents"
                disabled={pending}
                required
              />
              <Input
                aria-label="Recovery Evidence"
                value={recoveryEvidence}
                onChange={(event) => setRecoveryEvidence(event.target.value)}
                placeholder="evidence://recovery/..."
                disabled={pending}
                required
              />
              <Button type="submit" variant="outline" disabled={pending}>
                Incident lösen
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      {message ? (
        <p className="text-sm text-[var(--color-foreground-muted)]">{message}</p>
      ) : null}
    </div>
  );
}
