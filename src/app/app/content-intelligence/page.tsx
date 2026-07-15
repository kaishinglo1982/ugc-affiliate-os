"use client";

import { useCallback, useEffect, useState } from "react";

interface Profile {
  id: string;
  contentAssetId: string;
  hookType: string | null;
  analysisSource: string;
  confidenceScore: string | null;
  analyzedAt: string;
}
interface Variant {
  id: string;
  name: string;
  version: number;
  status: string;
}

const ANALYZE = "/api/content-intelligence";
const VARIANTS = "/api/content-intelligence/variants";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Anfrage fehlgeschlagen.");
  return body as T;
}

export default function ContentIntelligencePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [assetId, setAssetId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadProfiles = useCallback(async () => {
    if (!assetId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ profiles: Profile[] }>(`${ANALYZE}?assetId=${assetId}`);
      setProfiles(data.profiles);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  const loadVariants = useCallback(async () => {
    if (!assetId) return;
    try {
      const data = await api<{ variants: Variant[] }>(`${VARIANTS}?assetId=${assetId}`);
      setVariants(data.variants);
    } catch {
      /* ignore */
    }
  }, [assetId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfiles();
    void loadVariants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  const analyze = useCallback(async () => {
    if (!assetId) {
      setError("Content-Asset-ID erforderlich.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(ANALYZE, {
        method: "POST",
        body: JSON.stringify({
          contentAssetId: assetId,
          language: "de",
          hookType: "STORY",
          analysisSource: "MANUAL",
          confidenceScore: 0.9,
          productMentionCount: 1,
          affiliateDisclosurePresent: true,
          subtitlePresent: true,
        }),
      });
      await loadProfiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analyse fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }, [assetId, loadProfiles]);

  const createVariant = useCallback(async () => {
    if (!assetId) {
      setError("Content-Asset-ID erforderlich.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(VARIANTS, {
        method: "POST",
        body: JSON.stringify({ parentContentAssetId: assetId, name: `Entwurf ${variants.length + 1}`, generatedBy: "HUMAN" }),
      });
      await loadVariants();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Varianten-Anlage fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }, [assetId, variants.length, loadVariants]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Content-Intelligence</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Strukturierte, versionierte Content-Analyse. Veröffentlichte Varianten sind immutable.
        </p>
      </div>

      {error && <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="flex flex-wrap gap-3">
        <input className="rounded border px-3 py-2 text-sm" placeholder="Content-Asset-ID (UUID)" value={assetId} onChange={(e) => setAssetId(e.target.value)} />
        <button className="rounded border px-4 py-2 text-sm disabled:opacity-50" disabled={busy} onClick={() => void analyze()}>
          Analyse speichern
        </button>
        <button className="rounded bg-[var(--color-foreground)] px-4 py-2 text-sm text-[var(--color-background)] disabled:opacity-50" disabled={busy} onClick={() => void createVariant()}>
          Variant-Entwurf anlegen
        </button>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Profile</h2>
        {loading ? (
          <div className="rounded-md border p-6 text-center text-sm text-[var(--color-foreground-muted)]">Lädt…</div>
        ) : profiles.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-[var(--color-foreground-muted)]">
            {assetId ? "Keine Profile für dieses Asset." : "Gib eine Asset-ID ein, um Profile zu laden."}
          </div>
        ) : (
          <div className="space-y-2">
            {profiles.map((p) => (
              <div key={p.id} className="rounded border p-3 text-xs">
                {p.hookType ?? "kein Hook"} · {p.analysisSource} · Konfidenz: {p.confidenceScore ?? "—"} · {new Date(p.analyzedAt).toLocaleString()}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Varianten</h2>
        {variants.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-[var(--color-foreground-muted)]">
            {assetId ? "Keine Varianten." : "—"}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <span key={v.id} className="rounded bg-[var(--color-surface)] px-2 py-1 text-xs">
                {v.name} · v{v.version} · {v.status}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
