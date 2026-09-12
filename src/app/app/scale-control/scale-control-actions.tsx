"use client";

import { FormEvent, useState, useTransition } from "react";
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

type GateStatus = "PENDING" | "PASS" | "FAIL" | "WAIVED";

async function sendCommand(body: unknown) {
  const response = await fetch("/api/scale-control", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Scale-Control-Aktion fehlgeschlagen (${response.status})`);
  }
}

export function ScaleControlActions() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [regions, setRegions] = useState("DE");
  const [gateKey, setGateKey] = useState("regional_load_slo");
  const [regionCode, setRegionCode] = useState("DE");
  const [status, setStatus] = useState<GateStatus>("PENDING");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string>();

  const run = (command: unknown, successMessage: string) => {
    setMessage(undefined);
    startTransition(async () => {
      try {
        await sendCommand(command);
        setMessage(successMessage);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unbekannter Fehler");
      }
    });
  };

  const initialize = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const regionCodes = regions
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    run(
      {
        action: "initialize_readiness_gates",
        payload: { regionCodes },
      },
      "Phase-30- und Phase-40-Gates wurden initialisiert.",
    );
  };

  const updateGate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    run(
      {
        action: "set_scale_gate",
        payload: {
          gateKey,
          regionCode: regionCode.trim().toUpperCase(),
          status,
          required: true,
          evidenceReference: evidenceReference.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      },
      "Gate wurde aktualisiert und auditiert.",
    );
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Gate-Katalog initialisieren</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={initialize}>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="scale-regions">
                Regionen, kommasepariert
              </label>
              <Input
                id="scale-regions"
                value={regions}
                onChange={(event) => setRegions(event.target.value)}
                placeholder="DE, AT, CH"
                disabled={pending}
                required
              />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Wird verarbeitet…" : "Gates sicher initialisieren"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regionales Gate prüfen</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={updateGate}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="gate-key">
                  Gate-Key
                </label>
                <Input
                  id="gate-key"
                  value={gateKey}
                  onChange={(event) => setGateKey(event.target.value)}
                  disabled={pending}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="gate-region">
                  Region
                </label>
                <Input
                  id="gate-region"
                  value={regionCode}
                  onChange={(event) => setRegionCode(event.target.value)}
                  disabled={pending}
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="gate-status">
                Status
              </label>
              <select
                id="gate-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as GateStatus)}
                className="h-11 w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm"
                disabled={pending}
              >
                <option value="PENDING">PENDING</option>
                <option value="FAIL">FAIL</option>
                <option value="PASS">PASS</option>
                <option value="WAIVED">WAIVED</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="gate-evidence">
                Evidence Reference
              </label>
              <Input
                id="gate-evidence"
                value={evidenceReference}
                onChange={(event) => setEvidenceReference(event.target.value)}
                placeholder="evidence://reports/..."
                disabled={pending}
                required={status === "PASS" || status === "WAIVED"}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="gate-notes">
                Prüfnotiz
              </label>
              <Textarea
                id="gate-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={pending}
              />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Wird gespeichert…" : "Gate auditierbar setzen"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {message ? (
        <p className="text-sm text-[var(--color-foreground-muted)] xl:col-span-2">
          {message}
        </p>
      ) : null}
    </div>
  );
}
