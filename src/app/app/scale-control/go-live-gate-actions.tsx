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

type GateStatus = "PENDING" | "PASS" | "FAIL" | "WAIVED";

export function GoLiveGateActions() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [gateKey, setGateKey] = useState("database_migration");
  const [status, setStatus] = useState<GateStatus>("PENDING");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string>();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(undefined);
    startTransition(async () => {
      try {
        const response = await fetch("/api/executive-control", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "set_gate",
            payload: {
              gateKey,
              status,
              required: true,
              evidenceReference: evidenceReference.trim() || undefined,
              notes: notes.trim() || undefined,
            },
          }),
        });
        if (!response.ok) {
          throw new Error(`Go-live-Gate konnte nicht gespeichert werden (${response.status})`);
        }
        setMessage("Phase-30-Gate wurde aktualisiert und auditiert.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unbekannter Fehler");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phase-30-Go-live-Gate prüfen</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3 xl:grid-cols-2" onSubmit={submit}>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="go-live-key">
              Gate-Key
            </label>
            <Input
              id="go-live-key"
              value={gateKey}
              onChange={(event) => setGateKey(event.target.value)}
              disabled={pending}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="go-live-status">
              Status
            </label>
            <select
              id="go-live-status"
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
            <label className="mb-1 block text-sm font-medium" htmlFor="go-live-evidence">
              Evidence Reference
            </label>
            <Input
              id="go-live-evidence"
              value={evidenceReference}
              onChange={(event) => setEvidenceReference(event.target.value)}
              placeholder="evidence://ci/..."
              disabled={pending}
              required={status === "PASS" || status === "WAIVED"}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="go-live-notes">
              Prüfnotiz
            </label>
            <Textarea
              id="go-live-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="xl:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Wird gespeichert…" : "Go-live-Gate auditierbar setzen"}
            </Button>
            {message ? (
              <p className="mt-2 text-sm text-[var(--color-foreground-muted)]">
                {message}
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
