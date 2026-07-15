"use client";

import { useCallback, useEffect, useState } from "react";

interface Policy {
  id: string;
  scopeType: string;
  scopeId: string;
  mode: string;
  minimumSampleSize: number;
  minimumConfidenceScore: string;
  allowAiAnalysis: boolean;
  blockedRecommendationTypes: string[];
}

const API = "/api/optimization/policies";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Anfrage fehlgeschlagen.");
  return body as T;
}

export default function OptimizationPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scopeId, setScopeId] = useState("default");
  const [mode, setMode] = useState("OBSERVE_ONLY");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ policies: Policy[] }>(API);
      setPolicies(data.policies);
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

  const create = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await api(API, {
        method: "POST",
        body: JSON.stringify({
          scopeType: "WORKSPACE",
          scopeId,
          mode,
          minimumSampleSize: 1000,
          minimumConfidenceScore: 0.8,
          maximumRecommendationsPerDay: 10,
          allowAiAnalysis: false,
          allowAiVariantDrafts: false,
          requireApprovalForExperiment: true,
          requireApprovalForVariantDraft: true,
          requireApprovalForScheduleChange: true,
          blockedRecommendationTypes: [],
        }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Anlage fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }, [scopeId, mode, load]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Optimierungsrichtlinien</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Standardmäßig Beobachtungsmodus (OBSERVE_ONLY). KI-Funktionen sind opt-in und standardmäßig deaktiviert.
        </p>
      </div>

      {error && <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="flex flex-wrap gap-3">
        <input className="rounded border px-3 py-2 text-sm" placeholder="Scope-ID" value={scopeId} onChange={(e) => setScopeId(e.target.value)} />
        <select className="rounded border px-3 py-2 text-sm" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="OBSERVE_ONLY">OBSERVE_ONLY</option>
          <option value="RECOMMEND">RECOMMEND</option>
          <option value="DRAFT_VARIANTS">DRAFT_VARIANTS</option>
        </select>
        <button className="rounded bg-[var(--color-foreground)] px-4 py-2 text-sm text-[var(--color-background)] disabled:opacity-50" disabled={busy} onClick={() => void create()}>
          Richtlinie anlegen
        </button>
      </div>

      {loading ? (
        <div className="rounded-md border p-8 text-center text-sm text-[var(--color-foreground-muted)]">Lädt…</div>
      ) : policies.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-[var(--color-foreground-muted)]">Noch keine Richtlinien.</div>
      ) : (
        <div className="space-y-2">
          {policies.map((p) => (
            <div key={p.id} className="rounded border p-3 text-xs">
              <strong>{p.scopeType}</strong>:{p.scopeId} · {p.mode} · minSample {p.minimumSampleSize} · minKonfidenz {p.minimumConfidenceScore} · KI {p.allowAiAnalysis ? "an" : "aus"}
              {p.blockedRecommendationTypes.length > 0 ? ` · blockiert: ${p.blockedRecommendationTypes.join(", ")}` : ""}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
