# Archivierungsplan – alte UGC-Repositories

**Datum:** 2026-08-18
**Branch:** `agent/consolidate-all-ugc-projects`
**Auftrag:** Phase 140 – Alte Repositories reduzieren (ohne Löschen)

## Grundsatz

**Kein Repository wird gelöscht.** Nach erfolgreicher Konsolidierung wird dieser Plan dem Eigentümer zur Freigabe vorgelegt. Umsetzung erst nach ausdrücklicher Eigentümerfreigabe; niemals automatisch.

## Verzeichnis der Alt-Repositories

| # | Repository | Letzte Commit-ID | Übernommene Funktionen | Bewusst NICHT übernommen | Offene Issues/PRs | Empfohlene Aktion |
|---|-----------|------------------|------------------------|--------------------------|-------------------|-------------------|
| 1 | ugc-affiliate-agency | `947be58` (2026-07-29) | Konzepte: RLS-Tenant-Modell, Tenant-Rollen, Kampagnen-/Approval-Slice, AgentOS/Swarm-Muster (in Gate 50/MATRIX dokumentiert) | Drizzle-Schema, better-auth, Mock-Enterprise.ts-Daten, Swarm-RLS-Lücke, Docker/`npm ci`-Konfiguration | 0 offen (4 gemergt) | **Erstes Archivziel** – PUBLIC, ggf. Visibility PRIVATE vor Archivierung |
| 2 | one-user-ugc-affiliate-center | `ecdbdb7c` (2026-08-04) | Konzepte: Approval-Cost-Envelopes, Quality/Compliance/Claims, Finance-Ledger, Automation-Idempotenz, OmniRoute-Router, Desktop-Shell | Vite-SPA, React-Router-Stack, Single-User-ohne-Tenant-Modelle, PIN-auth, packages-Struktur | 8 DRAFT-PRs (stale, hinter main) | Zweites Archivziel |
| 3 | one-user-ugc-affiliate-center-main | `e24bc29` (2026-07-29) | nichts (Backup-Duplikat) | Prompt-Pack (doppelt verschachtelt), generierte Tauri-Artefakte, Gesamt-Code | 0 | **Drittes Archivziel** – reines Backup |
| 4 | compute-the-platform-to-build-zd | `fc2e048` (2026-07-06) | nichts direkt (Prototyp-Export; Band-2-Report als Herkunftsbeleg) | Mock-Enterprise-Schicht, ungeschützte Admin-Routen | 0 | Viertes Archivziel |
| 5 | who-knows-enterprise | `3f1a9f9` (2026-07-04) | nichts (fremdes Produkt "Who Knows", Streetwear) | gesamt | 0 | Archivziel (unabhängig von UGC) |

## Verweis-README (Empfehlung für jedes Alt-Repo)

> Dieses Repository wurde in [kaishinglo1982/ugc-affiliate-os](https://github.com/kaishinglo1982/ugc-affiliate-os) konsolidiert. Die aktive Weiterentwicklung findet ausschließlich dort statt. Dieses Repository bleibt als historische Referenz erhalten.

Zusätzlich empfohlen: Hinweis im README, bis zu welchem Commit der Stand reicht und welche Konzepte übernommen wurden (Link auf FEATURE_MATRIX.md im Ziel-Repo).

## Archivierungsreihenfolge (nach Freigabe des Eigentümers)

1. **ugc-affiliate-agency** (öffentlich): Verweis-README auf master committen → Branch-Status auf "archived" setzen (optional: Repository in README "Archived" markieren; GitHub-"Archive"-Feature ohne Löschung)
2. **one-user-ugc-affiliate-center**
3. **one-user-ugc-affiliate-center-main**
4. **compute-the-platform-to-build-zd**
5. **who-knows-enterprise** (optional, kein UGC-Bezug; nur wenn Eigentümer es wünscht)

Optionale Maßnahmen je Repo (alle ohne Löschung): Verweis-README, GitHub-Archieve-Flag, Dependabot deaktivieren, Beschreibung mit Archivierungshinweis aktualisieren, ggf. Sichtbarkeit PUBLIC→PRIVATE (nur für ugc-affiliate-agency, da public).

## Wiederherstellungsmöglichkeit

- Alle Repositories bleiben **vollständig klonbar** (kein Force-Push, kein Reflog-Verlust, kein Löschen von Tags/Branches).
- Lokale read-only Klone existieren zusätzlich unter `ugc-consolidation/sources/` (Stand 2026-08-18) als zweites Backup.
- Prompts/Playbooks: `one-user-ugc-affiliate-center-main` enthält ein Prompt-Pack – wird **nicht** migriert, bleibt im Archiv abrufbar.
- Migration jederzeit reversibel: Ziel-Repo hat keine Abhängigkeit von Alt-Repos (kein git remote, keine Importpfade).

## Erforderliche Eigentümerfreigabe

- [ ] Freigabe zum Setzen des Verweis-READMEs in den 4–5 Alt-Repos
- [ ] Freigabe für GitHub-Archivierungsflag (oder nur README-Verweis)
- [ ] Freigabe Sichtbarkeitsänderung ugc-affiliate-agency (public → private) falls gewünscht
- [ ] Keine Löschung ohne separates, ausdrückliches Eigentümer-Votum

## Abgrenzung

- Der **Draft-PR** und die **Konsolidierung selbst** sind unabhängig von dieser Freigabe.
- Niemand archiviert automatisch; dieser Plan dokumentiert nur den Vorgang.