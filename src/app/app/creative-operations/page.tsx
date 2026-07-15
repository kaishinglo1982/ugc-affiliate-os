"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CREATIVE_ANGLE_STATUS_LABELS, CREATIVE_ANGLE_TYPE_LABELS } from "@/lib/status-labels";
import { CREATIVE_ANGLE_TYPES } from "@/features/campaign-factory/domain/campaign-angle";
import { apiGet, apiPost } from "@/lib/client/api";
import { toast } from "sonner";

interface StrategyOption {
  id: string;
  name: string;
}

interface Angle {
  id: string;
  campaignStrategyId: string;
  name: string;
  angleType: string;
  description: string;
  coreMessage: string;
  status: string;
}

export default function CreativeOperationsPage() {
  const [strategies, setStrategies] = useState<StrategyOption[]>([]);
  const [strategyId, setStrategyId] = useState<string>("");
  const [angles, setAngles] = useState<Angle[]>([]);
  const [name, setName] = useState("");
  const [angleType, setAngleType] = useState<string>(CREATIVE_ANGLE_TYPES[0]);
  const [description, setDescription] = useState("");
  const [coreMessage, setCoreMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadStrategies() {
    const res = await apiGet<{ strategies: StrategyOption[] }>("/api/campaign-strategies");
    setStrategies(res.ok ? res.data?.strategies ?? [] : []);
  }

  async function loadAngles() {
    const url = strategyId
      ? `/api/campaign-angles?campaignStrategyId=${encodeURIComponent(strategyId)}`
      : "/api/campaign-angles";
    const res = await apiGet<{ angles: Angle[] }>(url);
    setAngles(res.ok ? res.data?.angles ?? [] : []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStrategies();
  }, []);

  useEffect(() => {
    void (async () => {
      const url = strategyId
        ? `/api/campaign-angles?campaignStrategyId=${encodeURIComponent(strategyId)}`
        : "/api/campaign-angles";
      const res = await apiGet<{ angles: Angle[] }>(url);
      setAngles(res.ok ? res.data?.angles ?? [] : []);
    })();
  }, [strategyId]);

  async function create() {
    if (!strategyId || !name || !description || !coreMessage) {
      toast.error("Strategie, Name, Beschreibung und Kernbotschaft erforderlich.");
      return;
    }
    setBusy(true);
    const res = await apiPost("/api/campaign-angles", {
      campaignStrategyId: strategyId,
      name,
      angleType,
      description,
      coreMessage,
    });
    setBusy(false);
    if (res.ok) {
      toast.success("Creative Angle erstellt");
      setName("");
      setDescription("");
      setCoreMessage("");
      void loadAngles();
    } else toast.error(res.error ?? "Erstellung fehlgeschlagen");
  }

  async function act(id: string, path: string, body?: Record<string, unknown>) {
    const res = await apiPost(path, body ?? {});
    if (res.ok) {
      toast.success("Aktualisiert");
      void loadAngles();
    } else toast.error(res.error ?? "Aktion fehlgeschlagen");
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Creative Studio</h1>
        <p className="text-muted-foreground">
          Creative Angles je freigegebener Strategie; vor Creative Brief freizugeben.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Neuer Creative Angle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label>Strategie</Label>
            <Select value={strategyId} onValueChange={setStrategyId}>
              <SelectTrigger>
                <SelectValue placeholder="Freigegebene Strategie wählen" />
              </SelectTrigger>
              <SelectContent>
                {strategies.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Angle-Typ</Label>
            <Select value={angleType} onValueChange={setAngleType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CREATIVE_ANGLE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {CREATIVE_ANGLE_TYPE_LABELS[t] ?? t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Beschreibung</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Kernbotschaft</Label>
            <Textarea value={coreMessage} onChange={(e) => setCoreMessage(e.target.value)} />
          </div>
          <Button disabled={busy} onClick={create}>
            Angle erstellen
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {angles.map((a) => (
          <Card key={a.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{a.name}</CardTitle>
              <Badge variant={a.status === "approved" ? "success" : "outline"}>
                {CREATIVE_ANGLE_STATUS_LABELS[a.status] ?? a.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {CREATIVE_ANGLE_TYPE_LABELS[a.angleType] ?? a.angleType}
              </p>
              <p className="text-sm">{a.description}</p>
              <p className="text-sm font-medium">{a.coreMessage}</p>
              <div className="flex gap-2">
                {a.status === "draft" && (
                  <>
                    <Button size="sm" onClick={() => act(a.id, `/api/campaign-angles/${a.id}/approve`)}>
                      Freigeben
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        act(a.id, `/api/campaign-angles/${a.id}/reject`, { reason: "Manuell abgelehnt" })
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
        {angles.length === 0 && (
          <p className="text-sm text-muted-foreground">Noch keine Creative Angles vorhanden.</p>
        )}
      </div>
    </div>
  );
}
