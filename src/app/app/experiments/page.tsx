"use client";

import { useCallback, useEffect, useState } from "react";

interface Variant {
  id: string;
  name: string;
  isControl: boolean;
  trafficWeight: number;
  status: string;
}
interface Result {
  status: string;
  winningVariantId: string | null;
  relativeLift: string | null;
  explanation: string;
}
interface Experiment {
  id: string;
  name: string;
  experimentType: string;
  status: string;
  approvalStatus: string;
  primaryMetric: string;
  minimumSampleSize: number;
  variants: Variant[];
  results: Result[];
}

const API = "/api/experiments";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Anfrage fehlgeschlagen.");
  return body as T;
}

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState("");
  const [variantsText, setVariantsText] = useState("Kontrolle, Variante B");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ experiments: Experiment[] }>(API);
      setExperiments(data.experiments);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const action = useCallback(
    async (id: string, path: string, body?: unknown, method: "POST" | "PATCH" = "POST") => {
      setBusy(id + path);
      setError(null);
      try {
        await api(`${API}/${id}/${path}`, { method, body: body ? JSON.stringify(body) : undefined });
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
      } finally {
        setBusy(null);
      }
    },
    [load],
  );

  const create = useCallback(async () => {
    if (!name || !brandId) {
      setError("Name und Brand-ID sind erforderlich.");
      return;
    }
    setBusy("create");
    setError(null);
    const variantNames = variantsText.split(",").map((v) => v.trim()).filter(Boolean);
    try {
      await api(API, {
        method: "POST",
        body: JSON.stringify({
          brandId,
          name,
          experimentType: "HOOK",
          primaryMetric: "CONVERSION_RATE",
          minimumSampleSize: 1000,
          minimumRuntimeHours: 72,
          maximumRuntimeHours: 720,
          confidenceThreshold: 0.95,
          practicalSignificanceThreshold: 0.01,
          trafficAllocationMode: "EQUAL",
          variants: variantNames.map((n, i) => ({ name: n, isControl: i === 0, trafficWeight: Math.floor(100 / variantNames.length) })),
        }),
      });
      setName("");
      setBrandId("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Anlage fehlgeschlagen.");
    } finally {
      setBusy(null);
    }
  }, [name, brandId, variantsText, load]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Experimente</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          A/B- und Multivariate-Tests mit Freigabe-Workflow. Gewinner werden nie automatisch live geschaltet.
        </p>
      </div>

      {error && <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-semibold">Neues Experiment</h2>
        <div className="flex flex-wrap gap-3">
          <input className="rounded border px-3 py-2 text-sm" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="rounded border px-3 py-2 text-sm" placeholder="Brand-ID (UUID)" value={brandId} onChange={(e) => setBrandId(e.target.value)} />
          <input className="rounded border px-3 py-2 text-sm" placeholder="Varianten (Komma-getrennt)" value={variantsText} onChange={(e) => setVariantsText(e.target.value)} />
          <button className="rounded bg-[var(--color-foreground)] px-4 py-2 text-sm text-[var(--color-background)] disabled:opacity-50" disabled={busy === "create"} onClick={() => void create()}>
            Anlegen
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-md border p-8 text-center text-sm text-[var(--color-foreground-muted)]">Lädt…</div>
      ) : experiments.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-[var(--color-foreground-muted)]">
          Noch keine Experimente. Lege oben ein erstes Experiment an.
        </div>
      ) : (
        <div className="space-y-4">
          {experiments.map((exp) => (
            <div key={exp.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-medium">{exp.name}</h3>
                  <p className="text-xs text-[var(--color-foreground-muted)]">
                    {exp.experimentType} · {exp.primaryMetric} · Status: {exp.status} · Freigabe: {exp.approvalStatus}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded border px-3 py-1.5 text-xs" disabled={busy === exp.id + "/request-approval"} onClick={() => void action(exp.id, "request-approval")}>
                    Freigabe anfragen
                  </button>
                  <button className="rounded border px-3 py-1.5 text-xs" disabled={busy === exp.id + "/approve"} onClick={() => void action(exp.id, "approve")}>
                    Freigeben
                  </button>
                  <button className="rounded border px-3 py-1.5 text-xs" disabled={busy === exp.id + "/start"} onClick={() => void action(exp.id, "start")}>
                    Starten
                  </button>
                  <button className="rounded border px-3 py-1.5 text-xs" disabled={busy === exp.id + "/pause"} onClick={() => void action(exp.id, "pause")}>
                    Pausieren
                  </button>
                  <button className="rounded border px-3 py-1.5 text-xs" disabled={busy === exp.id + "/complete"} onClick={() => void action(exp.id, "complete")}>
                    Abschließen
                  </button>
                  <button className="rounded bg-[var(--color-foreground)] px-3 py-1.5 text-xs text-[var(--color-background)]" disabled={busy === exp.id + "/analyze"} onClick={() => void action(exp.id, "analyze")}>
                    Analysieren
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {exp.variants.map((v) => (
                  <span key={v.id} className="rounded bg-[var(--color-surface)] px-2 py-1">
                    {v.name}
                    {v.isControl ? " (Kontrolle)" : ""} · {v.trafficWeight}%
                  </span>
                ))}
              </div>
              {exp.results.length > 0 && (
                <div className="mt-3 rounded bg-[var(--color-surface)] p-3 text-xs">
                  <strong>Letzte Analyse:</strong> {exp.results[0].status}
                  {exp.results[0].relativeLift ? ` · Lift: ${exp.results[0].relativeLift}` : ""}
                  <p className="mt-1 text-[var(--color-foreground-muted)]">{exp.results[0].explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
