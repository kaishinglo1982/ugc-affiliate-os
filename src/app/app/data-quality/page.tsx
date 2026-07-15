"use client";

import { useCallback, useEffect, useState } from "react";

interface DataQualityReport {
  id: string;
  overallScore: string | null;
  completenessScore: string | null;
  accuracyScore: string | null;
  timelinessScore: string | null;
  issueCount: number | null;
  generatedAt: string;
}
interface Anomaly {
  id: string;
  anomalyType: string;
  scopeType: string;
  scopeId: string;
  severity: string;
  status: string;
  explanation: string;
}

const API = "/api/analytics/data-quality";

async function api<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Anfrage fehlgeschlagen.");
  return body as T;
}

export default function DataQualityPage() {
  const [reports, setReports] = useState<DataQualityReport[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ reports: DataQualityReport[]; anomalies: Anomaly[] }>(API);
      setReports(data.reports);
      setAnomalies(data.anomalies);
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Datenqualität & Anomalien</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Transparente Qualitätsbewertung und neutrale Anomalie-Erkennung (kein Alarmismus).
          </p>
        </div>
        <button
          className="rounded bg-[var(--color-foreground)] px-4 py-2 text-sm text-[var(--color-background)] disabled:opacity-50"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              const res = await fetch("/api/analytics/anomalies/detect", { method: "POST" });
              const body = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(body.error ?? "Erkennung fehlgeschlagen.");
              await load();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Erkennung fehlgeschlagen.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Anomalien scannen
        </button>
        <button
          className="rounded border px-4 py-2 text-sm disabled:opacity-50"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              const res = await fetch("/api/analytics/data-quality/scan", { method: "POST" });
              const body = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(body.error ?? "Scan fehlgeschlagen.");
              await load();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Scan fehlgeschlagen.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Qualitätsbericht erstellen
        </button>
        <button
          className="rounded border px-4 py-2 text-sm disabled:opacity-50"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              const res = await fetch("/api/analytics/jobs/aggregate", { method: "POST" });
              const body = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(body.error ?? "Aggregation fehlgeschlagen.");
              await load();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Aggregation fehlgeschlagen.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Aus Events aggregieren
        </button>
      </div>

      {error && <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div>
        <h2 className="mb-2 text-sm font-semibold">Qualitätsberichte</h2>
        {loading ? (
          <div className="rounded-md border p-6 text-center text-sm text-[var(--color-foreground-muted)]">Lädt…</div>
        ) : reports.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-[var(--color-foreground-muted)]">Noch keine Berichte.</div>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <div key={r.id} className="rounded border p-3 text-xs">
                <strong>Gesamt:</strong> {r.overallScore ?? "—"} · Vollständigkeit: {r.completenessScore ?? "—"} · Genauigkeit: {r.accuracyScore ?? "—"} · Aktualität: {r.timelinessScore ?? "—"} · Issues: {r.issueCount ?? "—"} · {new Date(r.generatedAt).toLocaleString()}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Anomalien</h2>
        {loading ? (
          <div className="rounded-md border p-6 text-center text-sm text-[var(--color-foreground-muted)]">Lädt…</div>
        ) : anomalies.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-[var(--color-foreground-muted)]">Keine Anomalien.</div>
        ) : (
          <div className="space-y-2">
            {anomalies.map((a) => (
              <div key={a.id} className="rounded border p-3 text-xs">
                <span className="rounded bg-[var(--color-surface)] px-2 py-0.5">{a.severity}</span> {a.anomalyType} · {a.scopeType}:{a.scopeId.slice(0, 8)} · {a.status}
                <p className="mt-1 text-[var(--color-foreground-muted)]">{a.explanation}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
