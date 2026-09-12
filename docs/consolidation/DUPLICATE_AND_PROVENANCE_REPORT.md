# Duplikat- und Herkunftsanalyse – UGC Affiliate OS Konsolidierung

**Datum:** 2026-08-18
**Branch:** `agent/consolidate-all-ugc-projects`
**Auftrag:** Phase 30 – Duplikat- und Herkunftsanalyse

## 1. Methodik

- Hash/Vergleich: `diff -rq` (bytegenau) über komplette Bäume zzgl. stichprobenartiger Per-File-Hashes
- Git-Historie: vollständige `git log` der Quellen; Vergleich der Commit-Graphen
- Metadaten: GitHub-API (Branches, Tags, PRs, Sizes, CreatedAt/PushedAt)

## 2. Kernbefunde (Zusammenfassung)

| Paar | Verhältnis | Beleg | Bewertung |
|------|-----------|-------|-----------|
| one-user-ugc-affiliate-center ↔ one-user-ugc-affiliate-center-main | **Backup/Snapshot** eines früheren Stands + Prompt-Pack | -main hat **genau 1 Commit** ("Initial commit…", 2026-07-29) ohne gemeinsame Historie mit center (kein Fork); -main älter (15 vs. 37 Modelle, fehlende Routen/ADRs/`apps/web/src`); -main enthält generierte Tauri-Artefakte (`gen/`, `icons/`) und doppelt verschachteltes Prompt-Pack | **REJECT_DUPLICATE** als Code-Quelle; nur Archiv |
| compute-the-platform-to-build-zd → ugc-affiliate-agency | **Prototyp-Export = Stammeinheit** der Agency | agency-Initial-Commit a94ce03 (2026-07-06 19:54) liegt **2,5 h nach** dem compute-Commit (17:31); **byte-identische Dateien** (src/app/admin/* 17x, api/auth/[...all], api/v1/agents/chat+execute) zwischen beiden Bäumen; agency enthält docs/BAND_2_COMPLETION_REPORT.md und src/data/enterprise.ts aus dem Prototyp | compute = **ARCHIVE_ONLY**; agency trägt die Linie weiter |
| who-knows-enterprise ↔ compute-the-platform-to-build-zd | **Schwester-Exports desselben v0-Projekts** (`prj_Z3AKbM4iBnCmefLaK6JHKSI4LOyu` – identischer README-Link verifiziert), identisches Drizzle-Schema, identische MASTERPROMPT/ROADMAP | who-knows = Streetwear-Shop ("Who Knows"), compute = UGC-Agency-Prototyp mit Shop-Basis | who-knows = **REJECT** (fremdes Produkt, kein UGC-Affiliate-Code) |
| ugc-affiliate-os (Ziel) ↔ alle Quellen | **Unabhängige Neuentwicklung** | Prisma statt Drizzle, Radix-UI statt zustand, jose-JWT statt better-auth, eigene Phasenstruktur; 0 Treffer für `agencyProfile`/`BAND_2`/`ugc-agency`/v0-Referenzen im Ziel-Repo | Ziel bleibt technische Basis (Phase 60) |

## 3. Detailanalyse: one-user-ugc-affiliate-center vs. -main

**Metadaten:** center: erstellt 2026-07-10, 100+ Commits, HEAD `ecdbdb7c` (2026-08-04). -main: erstellt 2026-07-29, **1 Commit** (`e24bc29`), Größe 49.941 KB vs. center 595 KB (Differenz = generierte Artefakte + Prompt-Pack).

**Bytegenauer Baumvergleich** (ohne .git, 26 geänderte + 32 einseitige Dateien):
- Nur in center (neuere Entwicklung): `apps/web/src/` komplett, `apps/web/index.html`, `postcss.config.mjs`, `vite.config.ts`, Routen `dashboard/`, `approvals/`, `settings/`, `docs/architecture/phase-2-domain-persistence.md`, ADRs 0002–0005, `packages/ai-studio/package.json`
- Nur in -main (Export-Eigenheiten): `one-user-ugc-affiliate-center-prompt-pack/` (doppelt verschachtelt, inkl. fremder Kopie `who-knows-enterprise`), `apps/desktop/src-tauri/gen/`, `icons/`
- Geändert: nahezu alle UI-Seiten (ai-studio, automation, compliance, desktop, onboarding, quality, release, analytics, finance), alle zentralen Komponenten, `package.json`, `package-lock.json`, `ARCHITECTURE.md`, `Cargo.lock`, `tauri.conf.json`

**Verhältnis:** -main ist ein **Export eines älteren Quellstands** (Prisma 15 Modelle, eine Migration `20260711023000_phase17_automation_hardening`, d.h. Stand nach Phase 2 aber vor `phase2_core_domain`-Erweiterung) plus Exportschrott. Es existiert **keine gemeinsame Git-Historie** – kein Klon/Fork im Git-Sinn, sondern ein manuell erzeugtes Backup mit Squash-Commit.

**Empfehlung:** `one-user-ugc-affiliate-center` ist die einzige Quelle dieser Linie. `-main` wird **nicht** migriert, nur archiviert (LEGACY_REPOSITORY_ARCHIVE_PLAN). Alle dort enthaltenen Prompt-Pack-Dateien und generierten Artefakte sind für den Ziel-Code irrelevant.

## 4. Detailanalyse: compute-the-platform-to-build-zd ↔ ugc-affiliate-agency

| Beleg | Wert |
|-------|------|
| Zeitabstand der Initial-Commits | compute `2de1843` 18:32:21 vs. agency `a94ce03` 19:54:18 (2026-07-06, +82 min, +5 Fix-Commits bis 20:11) |
| Byte-identische Dateien | **20+ Dateien** (alle 17 `src/app/admin/*/page.tsx`, `api/auth/[...all]/route.ts`, `api/v1/agents/chat`, `api/v1/agents/execute`) |
| Gemeinsame Assets | `src/data/enterprise.ts`, `docs/BAND_2_COMPLETION_REPORT.md` in beiden |
| Weiterentwicklung in agency | better-auth eager + organization-Plugin, RLS-Migrationen, Tenant-Slices, Swarm-Bibliothek (~55 Dateien), Docker, 4 Testdateien |

**Herkunft:** compute-the-platform-to-build-zd ist der **nachweislich früheste greifbare UGC-Prototyp** (Konzeptursprung mit Band-2-Modulplan), agency ist dessen direkter Nachfolger. Beide enthalten **nur Mock-Fachlogik** in `src/data/enterprise.ts` (970 Z., 45+ Typen) bzw. Swarm-Mock-Adaptern.

**Empfehlung:** compute nur archivieren; dokumentarischer Restwert (Band-2-Report) in die Funktionsmatrix einfließen lassen.

## 5. Inhaltliche Duplikate und Konflikte (alle Repos)

### 5.1 Identische/ähnliche Module über Repros hinweg

| Konzept | Ziel (ugc-affiliate-os) | agency | center | Konflikt |
|---------|------------------------|--------|--------|----------|
| Auth | jose-JWT, eigen, 8 Rollen | better-auth + Org-Plugin | keine (PIN) | **3 inkompatible Lösungen** → Ziel bleibt |
| Tenant | workspaceId-Spalten, 1 Workspace, kein RLS | tenants + RLS (FORCE) | keins (Single-User-ADR) | agency-Modell ist am stärksten; Ziel muss Single-Owner + Multi-Tenant vereinen |
| ORM | Prisma 7 (126 Modelle) | Drizzle 0.45 (SQL-Migrationen) | Prisma 6 (37 Modelle) | **2 getrennte Schema-Welten**; Ziel-Prisma bleibt, agency-Konzepte portieren |
| Provider-Abstraktion | Registry + EncryptedCredential (AES-256-GCM) | Mock-Adapters (swarm/provider-mesh) | Adapter-Contracts + ProviderCredential-Referenzen | 3 konkurrierende Provider-Schichten → Ziel-Registry als Basis |
| Kosten-/Freigabe | Approval-Modell + Budget-Gates + Workflow-States | approval_requests (SQL-Slice, cost-Felder) | ApprovalRequest mit Cost-Envelopes (min/max, free-alt, Token-Hash) | center-Modell am reifsten (Token-Hash, Envelopes) |
| Video-Pipeline | VideoJob + Script/MediaAsset, kein Composer | video-production-runtime (Swarm) | Storyboard→VideoProject (Statusmaschine, Kosten) | center-Statusmaschine am reifsten; kein echter Composer irgendwo |
| Publishing | PublishJob durable Queue (Mock-Adapter) | social-publishing (Swarm, Mock) | PublishJob mit idempotencyKey@unique | Ziel am weitesten (Worker-Route, Backoff) |
| Automation/Agents | agents + workflows (Postgres-Leases) | agentos + swarm execution-engine + BullMQ | automation packages (Idempotenz/Outbox/Scheduler-Leases) | Ziel + center ergänzen sich |
| Quality/Compliance | data-quality + anomaly + experimentation | (im Swarm-Konzept) | quality-compliance-Package (fail-closed, Claims) | nur center hat Claim-/Disclosure-Logik |
| Finance | Revenue/Expense/Tax/BudgetPolicy + Approvals | finance-settlement (Swarm) + cfo/tax-agents | Ledger + Budgets + Forecasts (decimal.js) | center am reifsten (Ledger); Ziel hat Tax/Policy |
| Desktop | keine | keine | Tauri 2 (Keychain, signierte Updates) | nur center |

### 5.2 Verwaiste/veraltete Kopien, Mocks und Schein-Tests

1. **center-main**: Gesamtkopie (Abschnitt 3) → verworfen.
2. **compute**: Prototyp-Kopie der Agency-Mock-Schicht (`enterprise.ts`, 17 Admin-Seiten) → verworfen (nur Herkunftsbeleg).
3. **Mock-Implementierungen**: Alle drei aktiven Codebasen enthalten ausschließlich Mock/Fake-Provider für Video/LLM/Affiliate/Social (außer: agency-Gemini-Live-Call, Ziel-S3-Storage). Keine dieser Mocks darf als "Provider-Erfolg" dokumentiert werden → **TEST_DOUBLE_VERIFIED**-Kennzeichnung durchgängig.
4. **Scheinsicherheit in Tests**: agency-Tests decken Contracts/Integration, aber kein RLS-Verhalten im Swarm-Pfad (set_config fehlt dort); center goes grün ausschließlich mit deterministischen Testadaptern (selbst dokumentiert in `V1_KNOWN_LIMITATIONS.md`); Ziel hat Tenant-Isolationstest für workspaceId-Muster (einziger echter RLS-Ersatztest).
5. **Stale PR-Branches**: center PRs #1–8 (DRAFT) zeigen auf Branches, die **hinter** main liegen (Arbeit wurde direkt auf main gepusht; `git diff main phase-14…`: 238 Dateien Unterschied, main enthält mehr). Ziel-PRs #9/#18/#19 (DRAFT) ebenfalls nie gemerged. → Kein Funktionsverlust, nur Artefakte.

### 5.3 Inkompatible oder konkurrierende Konzepte (Warnliste für Gate 50)

- **ORM-Wechsel Drizzle→Prisma** (agency): Nur Konzepte portieren, keine Drizzle-Tabellen übernehmen – sonst Zwei-Datenmodell-Welt.
- **better-auth vs. jose-JWT**: Beibehaltung des Ziel-Auth; Organisationen/Invitations-Konzept daraus übernehmen.
- **Single-User (center) vs. Tenant (Ziel)**: center-Modelle haben keine tenant-Zuordnung; Übernahme nach Phase 70 (Single-Owner/Tenant-Vereinigung) **zwingend tenantfähig** portieren.
- **Kostenlogik**: center (Envelopes, Free-Alt) vs. Ziel (Approval + BudgetPolicy + Workflows) – vereinheitlichte Gate-Kette notwendig; doppelte Abbuchungsrisiken vermeiden (Idempotency).
- **Provider-Credentials**: Ziel `EncryptedCredential` (cipherText/iv/authTag/keyVersion) vs. center `ProviderCredential` (Referenz-String + Keychain). Ziel-Modell (DB-verschlüsselt) + Keychain-Referenz (desktop) kombinierbar.
- **License/Provenienz**: nur center hat Claim-/Disclosure-Logik; Ziel hat nichts → Migration nötig; agency nichts.

## 6. Herkunftsnachweis je Linie (für Modulmigrationen)

| Linie | Repos (älteste→neueste) | Verwendbarkeit |
|-------|------------------------|----------------|
| **v0-Prototypen** | who-knows-enterprise → compute-the-platform-to-build-zd | nur Archiv; Konzept-Herkunft |
| **Agency** | compute-the-platform-to-build-zd (Export) → **ugc-affiliate-agency** (HEAD `947be58`) | Konzept-/Architekturquelle: RLS-Tenant-Slice, Approval-Slice, AgentOS/Swarm-Muster |
| **One-User-Center** | **one-user-ugc-affiliate-center** (HEAD `ecdbdb7c`) + Backup `-main` (`e24bc29`, verworfen) | Modulquelle: Approvals/Envelopes, Quality/Compliance, Finance/Ledger, Automation-Idempotenz, Desktop-Shell |
| **Ziel** | **ugc-affiliate-os** (master `5f38509`, Branch `agent/ugc-commerce-core` +1 Commit) | technische Basis: Auth, Schema (126 Modelle), Registry-Provider, Analytics, Workflows, Agenten, E2E |

## 7. Verworfen (REJECT) mit Begründung

| Element | Begründung |
|---------|-----------|
| one-user-ugc-affiliate-center-main (Code) | Backup-Duplikat eines älteren Stands; keine eigene Entwicklungslinie |
| who-knows-enterprise (Code) | anderes Produkt (Streetwear-Shop); nur gleiche v0-Basis |
| Drizzle-Schema (agency) | inkompatible ORM-Welt; Konzepte (tenants, RLS-Policies, slice-Statemachine) werden auf Prisma portiert |
| better-auth (agency) | inkompatibel zum Ziel-Auth; Konzepte (Organization, Invitation) portieren |
| center-Vite-SPA & React-Router | Ziel ist Next.js-App; nur Fachmodule werden übernommen, kein zweiter App-Kern |
| center `packages/*`-Struktur | Funktional in Ziel-Strukturen portieren (src/lib, src/features), keine Parallel-Packages ohne Not |

## 8. Funktionsverluste durch Reife (bewusst beobachten)

- agency-Branch-Erkenntnisse aus `feat/auth-multitenancy`, `feat/session-tenant-campaign-slice` und `feat/ugc-swarm-foundation-batch-01` (4 Merges) sind in master enthalten; `feat/affiliate-campaign-content-slice` (CLOSED, ohne Merge) enthielt Vorgänger-Ideen – bereits durch nachfolgende Slices ersetzt. **Kein Verlust.**
- center Phase-11/12/13/14/15/16 liegen teils nur als Stale-Branches vor? → **Nein**: Commits sind auf main enthalten (PRs waren nur Deckblätter); Stichprobe: Phase-14-Branch liegt hinter main (main hat 26.726 Zeilen mehr), d.h. main enthält alles.
- Prompt-Pack (nur in -main-Backup): kein Code; wird im Archivierungsplan als kulturelles Artefakt erwähnt, nicht migriert.