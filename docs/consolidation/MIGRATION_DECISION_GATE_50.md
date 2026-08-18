# Gate 50 – Migrationsentscheidung UGC Affiliate OS

**Datum:** 2026-08-18
**Branch:** `agent/consolidate-all-ugc-projects`
**Status:** Freigabe zur additiven, lokal getesteten Migration. Destruktive Datenänderungen: **keine geplant**; vor jeder potenziell destruktiven Änderung wird gestoppt.

## 1. Empfohlene Zielarchitektur

**Modularer Monolith in ugc-affiliate-os (unverändert):** eine Next.js-Anwendung (App Router), ein PostgreSQL-Schema (Prisma 7), ein Deployment (Vercel + systemd-Timer), eine Auth-Schicht (jose-JWT), eine Provider-Runtime (Registry + Router), ein Tenant-Modell (workspaceId + Tenant-Entität + optional RLS).

- **Kein** Monorepo-Umbau in Stage 1 (Struktur bleibt tragfähig, Phase 60 gestattet Beibehaltung).
- **Drei neue Domänen-Schichten** in der bestehenden Struktur:
  - `src/lib/tenancy/` – Tenant-Auflösung, Single-Owner-Default-Tenant, Kontext-Bindung
  - `src/lib/governance/` – Freigabe-/Kosten-Gates (envelope, token-hash, budget-check, idempotency)
  - `src/lib/pipeline/` – UGC-Pipeline-Konfiguration (Product/URL → Claims → Script → Shotlist → B-Roll → Avatar → Composer → Cost → License → Human Review → publishable → A/B → Creator-Eskalation)
- Provider-Runtime: bestehende `src/lib/providers/`-Registries bleiben **single source**; neue Adapter (pexels, heygen, omniroute, internal-composer, creator-manual, test-double) werden als **test-double-fähige Contracts** ergänzt. KEINE echten Provider-Calls in Tests/CI.
- Datenmodell: bestehendes Schema (126 Modelle) + additive Modelle (Tenant, Feature Flags für Modus, Provenienz-/Lizenzfelder, Budget-Envelope, Eskalations-Aufträge).

## 2. Vollständige Liste der gefundenen UGC-Repositories

| Repo | Rolle |
|------|-------|
| ugc-affiliate-os | **ZIEL** – technische Basis |
| ugc-affiliate-agency | Quelle: Tenant/RLS-Konzept, Kampagnen-Slice, AgentOS-Swarm-Muster, Org-/Invitation-Auth |
| one-user-ugc-affiliate-center | Quelle: Approval-Envelopes, Quality/Compliance/Claims, Finance-Ledger, Automation-Idempotenz, Desktop-Shell, OmniRoute-Router |
| one-user-ugc-affiliate-center-main | **Archiv nur** (Backup-Snapshot, REJECT_DUPLICATE) |
| compute-the-platform-to-build-zd | **Archiv nur** (Prototyp-Export, in agency fortgeführt) |
| who-knows-enterprise | **Archiv nur** (fremdes Produkt, gleiche v0-Basis) |

Keine weiteren UGC-relevanten Repos/Branches/Tags/PRs im Konto gefunden (15 Repos gescannt; Tags: 0 in allen Repos).

## 3. Beste Quelle je Funktionsbereich (Kurzform, Details in FEATURE_MATRIX.md)

| Bereich | Quelle |
|---------|--------|
| Auth-Kern, RBAC-Permissions, Produkt-Domain, Publishing-Queue, Analytics, Agenten/Workflows, CI/CD | KEEP_TARGET |
| Tenant-Isolation (RLS-Muster), Tenant-Rollen, Kampagnen-Slice, Onboarding | PORT_SOURCE aus agency |
| OmniRoute-Router, Approval-Cost-Envelopes, Quality/Compliance/Claims/Lizenz/Provenienz, Finance-Ledger, Automation-Scheduler/Outbox, Webhook-Security, Desktop-Shell | PORT_SOURCE aus center |
| Attribution/Profitability-Verdrahtung, Kosten-Gates, BYOK-Referenzen | MERGE (T+C bzw. T+A) |
| Pexels, HeyGen, Vidnoz, Composer, Creator-Eskalation | REWRITE als neue test-double-fähige Contracts (Vidnoz: manueller Workflow) |

## 4. Zu übernehmende Module (mit Quelle und Commit)

| Modul | Quelle | Quell-Commit |
|-------|--------|--------------|
| Tenant-Entität + RLS-Muster + Mitgliedsrollen | A | `947be58` (migrations/0002/0003, tenant-context.ts) |
| Kampagnen-Zustands- und Freigabekette | A | `947be58` |
| Org-/Invitations-Muster (Konzept) | A | `37014ba/7d1b9d3` |
| Provider-Router (free-first/balanced/premium/manual) | C | `ecdbdb7c` (packages/…) |
| Approval-Cost-Envelope + ApprovalTokenHash | C | `ecdbdb7c` (schema ApprovedRequest) |
| Quality/Compliance-Regelwerk + Claims/Disclosures | C | `ecdbdb7c` |
| Finance-Ledger/Budgets/Forecasts (decimal.js-Prinzip) | C | `ecdbdb7c` |
| Automation-Idempotenz/Outbox/Scheduler-Lease | C | `ecdbdb7c` |
| Webhook-Signatur + Replay-Schutz | C | `ecdbdb7c` |
| Desktop-Shell (Tauri, Keychain) – **deferred** | C | `ecdbdb7c` |

Alle Übernahmen erfolgen als **Neuentwicklung im Ziel-Stil** (kein Kopieren fremder Ordnerstrukturen; Herkunft im Code-Header bzw. in docs/consolidation dokumentiert).

## 5. Neu zu schreibende Module (REWRITE)

1. `pexels`-Adapter (B-Roll, offizieller Endpoint, Key-only-Server, Rate-Limit-Respekt) – Test-Double-Default
2. `heygen`-Adapter (Avatar-Video, offizielle API, capability detection) – Test-Double-Default
3. `vidnoz`-Adapter → **manueller Export/Import-Workflow** (kein Scraping, keine erfundenen Endpoints)
4. `omniroute`-Routing-Ebene (Provider-Auswahl-Router als Erweiterung von Registry)
5. `internal-composer` (Shot-List→Asset-Bundle-Zusammenbau als deterministischer Service; ohne Render-Auftrag default)
6. `creator-manual`-Eskalations-Workflow (Eskalations-Auftrag + Genehmigungs-Gate, keine automatische Beauftragung/Zahlung)
7. `test-double`-Adapterklasse (für alle Provider; dokumentierte Nicht-Produktionsantworten)

## 6. Verworfen (REJECT)

| Element | Grund |
|---------|-------|
| one-user-ugc-affiliate-center-main (Code) | Backup-Duplikat, älterer Stand, keine eigene Linie |
| who-knows-enterprise (Code) | fremdes Produkt (Streetwear-Shop) |
| Drizzle Schema / ORM (A) | inkompatible ORM-Welt; Konzepte werden auf Prisma portiert |
| better-auth (A) | inkompatibel zum Ziel-Auth; Konzepte portieren |
| Vite-SPA + react-router (C) | Zweit-App-Kern; nur Fachmodule portieren |
| C-Packages als npm-Workspaces | Ziel ist eine Next-App; Domänen als src/lib-Module |
| Alle Mock-Provider als "echt" darzustellen | Vorgabe: Mock ≠ Providererfolg |

## 7. Risiken

### 7.1 Authentifizierungsrisiken
- Drei Auth-Welten (jose/better-auth/PIN): **R1** – Portierung von A-Org-Konzept in Ziel-JWT-Auth darf RBAC nicht schwächen. Mildern: Rollen-/Permission-Tests stabilisieren, bestehende Auth-Tests unverändert grün halten.
- **R2** – Session-Downgrade: keine Silent-Downgrades bei ungültigem Tenant-Token (bestehende hart-Ablehnung beibehalten).
- **R3** – Keine Secrets in Logs/UI: maskierte Anzeige + Redaction (C-Muster) übernehmen.

### 7.2 Tenant-Risiken
- **R4** – workspaceId-Spalten ohne RLS aktuell nur Software-Enforcement; RLS nach Einführung von richtigen Tenants darf bestehende Single-User-Installationen nicht sperren. Mildern: RLS erst NACH Default-Tenant-Seeding aktivieren, Migration rein additiv, Test auf leerer DB + Bestandsdaten.
- **R5** – Cross-Tenant-Zugriff: alle neuen repos/services verpflichtend mit `requireTenant`-Guard + Tests (Isolationstests je Modul).

### 7.3 Datenbankrisiken
- **R6** – Schema-Differenz T(126)↔C(37): KEINE Übernahme von C-Modellen 1:1 (Single-User ohne tenant); jede Übernahme erhält tenantId/workspaceId.
- **R7** – `Approval`/`BudgetPolicy` in T vs. Envelope-Modell in C: Merge additiv (neue Felder + neue Tabelle), keine bestehende Spalte umdeuten.
- **R8** – Decimal-Handling: C nutzt Decimal-Spalten; T hat `Decimal`-Felder (Revenue/Expense) – Konsistenz prüfen, keine Float-Money-Erweiterung.

### 7.4 Dependency-Konflikte
- **R9** – TS: Repo-Stand `typescript@^7.0.2` (getrackt) vs. lokales Experiment 6.0.3 (uncommitted, nicht Teil der Konsolidierung). Konsolidierungs-Arbeit wird gegen den **lokal funktionierenden** Stand ausgeführt; getrackte Deps werden nicht angefasst; Abschlussbericht weist den Konflikt gesondert aus.
- **R10** – Keine neuen Laufzeit-Dependencies ohne Not; alle neuen Module mit vorhandenen Deps (zod, jose, prisma) bauen.

### 7.5 Erwartete Migrationskonflikte
- Namenskollisionen: `Approval` (T: bereits vorhanden) vs. C-Envelope → Envelope als eigene Entität.
- `Campaign`-Schema (T) vs. A-Slice-Status: T-Schema erweitern (Statusfelder additiv), nicht ersetzen.
- Provider-Key-Namen: T-Enum erweitern (PEXELS, HEYGEN, OMNIROUTE, INTERNAL_COMPOSER, CREATOR_MANUAL, TEST_DOUBLE) statt neu erfinden.

## 8. Geplante Reihenfolge (Phasen 70 → 100)

1. **Phase 70:** Tenant-Entität + Modus (single_owner/multi_tenant) + Default-Tenant + Kontext-Auflösung; RBAC-Tenant-Bindung additiv; Tests (Tenant-Isolation, Cross-Tenant verhindert)
2. **Phase 80.1:** Governance-Gates (Envelope + Token-Hash + Budget-Check + Idempotency-Schlüssel in Approval-Flow)
3. **Phase 80.2:** Provider-Runtime + BYOK (Umbenennung/Erweiterung der Registry; maskierter Key-Store; Key-Rotation; Health/Capability)
4. **Phase 80.3:** Affiliate-Produkte + Netzwerk-Registry (keine neuen Live-Keys)
5. **Phase 80.4:** Kampagnen-Slice (Statusflow + Tenant-Bindung)
6. **Phase 80.5/6:** Content Factory / Script Studio + Hooks
7. **Phase 90:** UGC-Video-Pipeline (Statusmaschine + Adapter-Contracts + Cost/License/Review-Gates)
8. **Phase 80.7:** Claims/Compliance/Provenienz (fail-closed, Claim-Gate)
9. **Phase 80.8:** Social Publishing (KEEP, Human-Review-Gate)
10. **Phase 80.9:** Analytics + Attribution (commerce-core verdrahten)
11. **Phase 80.10:** Finance (Ledger-Prinzip additiv auf T-Finance)
12. **Phase 80.11:** Creator-Eskalation (manuell)
13. **Phase 80.12:** Agenten/Workflows (Scheduler/Outbox)
14. **Phase 80.13:** Desktop-Shell (deferred, optional)
15. **Phase 110/120:** Sicherheitsprüfung + Gesamtverifikation
16. **Phase 130/140:** Commits, Push, Draft-PR, Archivierungsplan

## 9. Teststrategie

- Jede Migration: **erst Tests, dann Implementierung** (Rote-Grün-Gate)
- Pflicht je Modul: Unit + Integration; Tenant-Isolationstest je Tenant-fähiger Entität; Bestandsdaten- und Leer-DB-Migrationstest lokal (Prisma `migrate dev` auf lokaler Postgres **oder** `prisma migrate diff`-Prüfung ohne Produktion)
- Keine echten kostenpflichtigen Provider-Aufrufe in Tests/CI; alle Provider-Tests via TEST_DOUBLE
- Bestehende 44 Unit- + 8 E2E-Tests müssen grün bleiben (Regression)

## 10. Rollbackstrategie

- Alles additiv: Revert = Entfernen der neuen Modelle/Felder via eigener Rückwärts-Migration auf lokaler DB ODER Feature-Flag-Abschaltung (Modus-Flag `APP_TENANT_MODE=single_owner`), bevor Daten geschrieben werden
- Keine Force-Pushs; Fehlerkorrekturen als neue Commits; kein Reset
- Vor jeder Migration: Schema-Backup/Kopie der lokalen Dev-DB (pg_dump) und Notiz über Migration-ID

## 11. Freigabe-Punkte für den Menschen

- Vor Einführung von RLS (RECHTSWIRKUNG auf Produktion)
- Vor jeglichen echten Provider-Keys / kostenpflichtigen Aufrufen (Budgetprüfung + Freigabe)
- Vor Vidnoz-/Pexels-/HeyGen-LIVE-Schaltung
- Vor Creator-Auftragsfunktionen (nur manuell)
- Vor Desktop-Posprozess (deferred)