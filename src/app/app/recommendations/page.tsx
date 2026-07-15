"use client";

import { useCallback, useEffect, useState } from "react";

interface Recommendation {
  id: string;
  recommendationType: string;
  scopeType: string;
  scopeId: string;
  title: string;
  explanation: string;
  confidenceScore: string;
  expectedImpact: string;
  status: string;
}

const API = "/api/recommendations";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Anfrage fehlgeschlagen.");
  return body as T;
}

export default function RecommendationsPage() {
  const [items, setItems] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ recommendations: Recommendation[] }>(API);
      setItems(data.recommendations);
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
    async (id: string, path: string, body?: unknown) => {
      setBusy(id + path);
      setError(null);
      try {
        await api(`${API}/${id}?action=${path}`, { method: "POST", body: body ? JSON.stringify(body) : undefined });
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
      } finally {
        setBusy(null);
      }
    },
    [load],
  );

  const generate = useCallback(async () => {
    setBusy("generate");
    setError(null);
    try {
      await api(`${API}?action=generate`, { method: "POST" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generierung fehlgeschlagen.");
    } finally {
      setBusy(null);
    }
  }, [load]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Empfehlungen & Automatisierung</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Regelbasierte, nachvollziehbare Empfehlungen. Jede Änderung erfordert Freigabe.
          </p>
        </div>
        <button className="rounded bg-[var(--color-foreground)] px-4 py-2 text-sm text-[var(--color-background)] disabled:opacity-50" disabled={busy === "generate"} onClick={() => void generate()}>
          Empfehlungen generieren
        </button>
      </div>

      {error && <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      {loading ? (
        <div className="rounded-md border p-8 text-center text-sm text-[var(--color-foreground-muted)]">Lädt…</div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-[var(--color-foreground-muted)]">
          Keine Empfehlungen. Klicke „Empfehlungen generieren“, um die Regel-Engines über deine Daten laufen zu lassen.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((r) => (
            <div key={r.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium">{r.title}</h3>
                  <p className="text-xs text-[var(--color-foreground-muted)]">
                    {r.recommendationType} · {r.scopeType}:{r.scopeId.slice(0, 8)} · Konfidenz: {r.confidenceScore} · Impact: {r.expectedImpact} · Status: {r.status}
                  </p>
                  <p className="mt-1 text-sm">{r.explanation}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded border px-3 py-1.5 text-xs" disabled={busy === r.id + "review"} onClick={() => void action(r.id, "review", { status: "REVIEWED" })}>
                    Review
                  </button>
                  <button className="rounded border px-3 py-1.5 text-xs" disabled={busy === r.id + "accept"} onClick={() => void action(r.id, "review", { status: "ACCEPTED" })}>
                    Annehmen
                  </button>
                  <button className="rounded border px-3 py-1.5 text-xs" disabled={busy === r.id + "reject"} onClick={() => void action(r.id, "review", { status: "REJECTED" })}>
                    Ablehnen
                  </button>
                  <button className="rounded border px-3 py-1.5 text-xs" disabled={busy === r.id + "variant-draft"} onClick={() => void action(r.id, "variant-draft")}>
                    Variant-Entwurf
                  </button>
                  <button className="rounded bg-[var(--color-foreground)] px-3 py-1.5 text-xs text-[var(--color-background)]" disabled={busy === r.id + "experiment-draft"} onClick={() => void action(r.id, "experiment-draft")}>
                    Experiment-Entwurf
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
