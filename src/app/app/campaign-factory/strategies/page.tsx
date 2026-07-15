"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CAMPAIGN_STRATEGY_STATUS_LABELS } from "@/lib/status-labels";
import {
  CAMPAIGN_OBJECTIVES,
  CAMPAIGN_PRIMARY_METRICS,
} from "@/features/campaign-factory/domain/campaign-strategy";
import { apiGet, apiPost } from "@/lib/client/api";
import { toast } from "sonner";

interface CandidateOption {
  id: string;
  name: string | null;
}

interface AudienceOption {
  id: string;
  name: string;
}

interface Strategy {
  id: string;
  campaignCandidateId: string;
  name: string;
  objective: string;
  primarySuccessMetric: string;
  status: string;
  createdAt: string;
}

const OBJECTIVE_LABELS: Record<string, string> = {
  traffic: "Traffic",
  affiliate_clicks: "Affiliate-Klicks",
  conversions: "Conversions",
  revenue: "Umsatz",
  content_testing: "Content-Testing",
};

const METRIC_LABELS: Record<string, string> = {
  views: "Views",
  clicks: "Klicks",
  ctr: "CTR",
  conversions: "Conversions",
  conversion_rate: "Conversion-Rate",
  commission_revenue: "Provision",
  estimated_net_revenue: "Netto-Umsatz",
  return_on_content_spend: "ROCS",
};

export default function CampaignStrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [audiences, setAudiences] = useState<AudienceOption[]>([]);
  const [candidateId, setCandidateId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [objective, setObjective] = useState<string>(CAMPAIGN_OBJECTIVES[0]);
  const [metric, setMetric] = useState<string>(CAMPAIGN_PRIMARY_METRICS[0]);
  const [audienceId, setAudienceId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [s, c, a] = await Promise.all([
      apiGet<{ strategies: Strategy[] }>("/api/campaign-strategies"),
      apiGet<{ candidates: CandidateOption[] }>("/api/campaign-candidates?status=approved"),
      apiGet<{ audiences: AudienceOption[] }>("/api/campaign-audiences"),
    ]);
    setStrategies(s.ok ? s.data?.strategies ?? [] : []);
    setCandidates(c.ok ? c.data?.candidates ?? [] : []);
    setAudiences(a.ok ? a.data?.audiences ?? [] : []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  async function createStrategy() {
    if (!candidateId || !name) {
      toast.error("Kandidat und Name erforderlich.");
      return;
    }
    setBusy(true);
    const res = await apiPost("/api/campaign-strategies", {
      campaignCandidateId: candidateId,
      name,
      objective,
      primarySuccessMetric: metric,
      targetAudienceProfileId: audienceId || undefined,
    });
    setBusy(false);
    if (res.ok) {
      toast.success("Strategie erstellt");
      setName("");
      setAudienceId("");
      void load();
    } else toast.error(res.error ?? "Erstellung fehlgeschlagen");
  }

  async function act(path: string, body?: Record<string, unknown>) {
    const res = await apiPost(path, body ?? {});
    if (res.ok) {
      toast.success("Aktualisiert");
      void load();
    } else toast.error(res.error ?? "Aktion fehlgeschlagen");
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kampagnen-Strategien</h1>
        <p className="text-muted-foreground">
          Pro freigegebenem Kandidaten genau eine Strategie; vor Creative-Arbeit freizugeben.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Neue Strategie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label>Kandidat</Label>
            <Select value={candidateId} onValueChange={setCandidateId}>
              <SelectTrigger>
                <SelectValue placeholder="Freigegebenen Kandidaten wählen" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name ?? c.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Q3 Beauty Push"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Ziel</Label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_OBJECTIVES.map((o) => (
                    <SelectItem key={o} value={o}>
                      {OBJECTIVE_LABELS[o] ?? o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Primäre Metrik</Label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_PRIMARY_METRICS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {METRIC_LABELS[m] ?? m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Zielgruppe (optional)</Label>
            <Select value={audienceId} onValueChange={setAudienceId}>
              <SelectTrigger>
                <SelectValue placeholder="Bestehende Zielgruppe verknüpfen" />
              </SelectTrigger>
              <SelectContent>
                {audiences.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button disabled={busy} onClick={createStrategy}>
            Strategie erstellen
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {strategies.map((st) => (
          <Card key={st.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{st.name}</CardTitle>
              <Badge variant={st.status === "approved" ? "success" : "outline"}>
                {CAMPAIGN_STRATEGY_STATUS_LABELS[st.status] ?? st.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                {OBJECTIVE_LABELS[st.objective] ?? st.objective} ·{" "}
                {METRIC_LABELS[st.primarySuccessMetric] ?? st.primarySuccessMetric}
              </div>
              <div className="flex gap-2">
                {st.status === "draft" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => act(`/api/campaign-strategies/${st.id}/request-approval`)}
                  >
                    Freigabe anfragen
                  </Button>
                )}
                {st.status === "under_review" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => act(`/api/campaign-strategies/${st.id}/approve`)}
                    >
                      Freigeben
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        act(`/api/campaign-strategies/${st.id}/reject`, { reason: "Manuell abgelehnt" })
                      }
                    >
                      Ablehnen
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {strategies.length === 0 && (
          <p className="text-sm text-muted-foreground">Noch keine Strategien vorhanden.</p>
        )}
      </div>
    </div>
  );
}
