"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CAMPAIGN_AUDIENCE_STATUS_LABELS } from "@/lib/status-labels";
import { apiGet, apiPost, apiDelete } from "@/lib/client/api";
import { toast } from "sonner";

interface Audience {
  id: string;
  name: string;
  description: string;
  status: string;
  languageCodes: string[];
  countryCodes: string[];
  interestTags: string[];
  problemStatements: string[];
  desiredOutcomes: string[];
  objections: string[];
  trustSignals: string[];
}

function toList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function AudiencesPage() {
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [interests, setInterests] = useState("");
  const [problems, setProblems] = useState("");
  const [outcomes, setOutcomes] = useState("");
  const [objections, setObjections] = useState("");
  const [trust, setTrust] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await apiGet<{ audiences: Audience[] }>("/api/campaign-audiences");
    setAudiences(res.ok ? res.data?.audiences ?? [] : []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  async function create() {
    if (!name || !description) {
      toast.error("Name und Beschreibung erforderlich.");
      return;
    }
    setBusy(true);
    const res = await apiPost("/api/campaign-audiences", {
      name,
      description,
      interestTags: toList(interests),
      problemStatements: toList(problems),
      desiredOutcomes: toList(outcomes),
      objections: toList(objections),
      trustSignals: toList(trust),
    });
    setBusy(false);
    if (res.ok) {
      toast.success("Zielgruppe erstellt");
      setName("");
      setDescription("");
      setInterests("");
      setProblems("");
      setOutcomes("");
      setObjections("");
      setTrust("");
      void load();
    } else toast.error(res.error ?? "Erstellung fehlgeschlagen");
  }

  async function act(id: string, body: Record<string, unknown>) {
    const res = await apiPost(`/api/campaign-audiences/${id}`, body);
    if (res.ok) {
      toast.success("Aktualisiert");
      void load();
    } else toast.error(res.error ?? "Aktion fehlgeschlagen");
  }

  async function remove(id: string) {
    const res = await apiDelete(`/api/campaign-audiences/${id}`);
    if (res.ok) {
      toast.success("Gelöscht");
      void load();
    } else toast.error(res.error ?? "Löschen fehlgeschlagen");
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Zielgruppen</h1>
        <p className="text-muted-foreground">
          Wiederverwendbare Zielgruppen-Profile; pro Strategie freigebbar.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Neue Zielgruppe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Fitness Moms" />
          </div>
          <div className="grid gap-2">
            <Label>Beschreibung</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurzbeschreibung der Zielgruppe"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Interessen (Komma-getrennt)</Label>
              <Input value={interests} onChange={(e) => setInterests(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Probleme (Komma-getrennt)</Label>
              <Input value={problems} onChange={(e) => setProblems(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Wünsche (Komma-getrennt)</Label>
              <Input value={outcomes} onChange={(e) => setOutcomes(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Einwände (Komma-getrennt)</Label>
              <Input value={objections} onChange={(e) => setObjections(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Trust-Signale (Komma-getrennt)</Label>
            <Input value={trust} onChange={(e) => setTrust(e.target.value)} />
          </div>
          <Button disabled={busy} onClick={create}>
            Zielgruppe erstellen
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {audiences.map((a) => (
          <Card key={a.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{a.name}</CardTitle>
              <Badge variant={a.status === "approved" ? "success" : "outline"}>
                {CAMPAIGN_AUDIENCE_STATUS_LABELS[a.status] ?? a.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{a.description}</p>
              {a.interestTags.length > 0 && (
                <p className="text-xs">Interessen: {a.interestTags.join(", ")}</p>
              )}
              <div className="flex gap-2">
                {a.status === "draft" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => act(a.id, { status: "approved" })}
                    >
                      Freigeben
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => act(a.id, { status: "rejected" })}
                    >
                      Ablehnen
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => remove(a.id)}>
                      Löschen
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {audiences.length === 0 && (
          <p className="text-sm text-muted-foreground">Noch keine Zielgruppen vorhanden.</p>
        )}
      </div>
    </div>
  );
}
