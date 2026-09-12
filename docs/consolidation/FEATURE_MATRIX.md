# Funktionsmatrix – UGC Affiliate OS Konsolidierung

**Datum:** 2026-08-18
**Branch:** `agent/consolidate-all-ugc-projects`
**Auftrag:** Phase 40 – Funktionsmatrix
**Quellen-Kürzel:** T = ugc-affiliate-os (Ziel), A = ugc-affiliate-agency, C = one-user-ugc-affiliate-center, CM = center-main (verworfen), P = compute-the-platform-to-build-zd (Prototyp), W = who-knows-enterprise (fremd)

**Reifegrad:** [0] fehlt · [1] Konzept/Statusmaschine · [2] deterministische Logik ohne Live-Adapter · [3] echte Integration vorhanden (Live) · [4] produktiv erprobt
**Entscheidungen:** KEEP_TARGET · PORT_SOURCE · MERGE · REWRITE · ARCHIVE_ONLY · REJECT_INSECURE · REJECT_DUPLICATE

| Bereich | Ziel vorhanden | Beste Quelle | Reifegrad | Tests | Entscheidung | Begründung |
|---|---|---|---|---|---|---|
| Authentifizierung | Ja (jose-JWT, Session, bcrypt) | T | T2/A2/C1 | T: session/password-Funktionen u. Tests; A: org-Auth | **KEEP_TARGET + PORT(Org-/Invitations-Konzept aus A)** | Ziel-Auth ist sicher (Session-Secret-Hash), A hat Organization-Patterns für Multi-Tenant; kein Wechsel auf better-auth |
| Tenant-Isolation | Teilweise (workspaceId-Spalten, 1 Workspace, kein RLS) | A | A2/T1 | T: `tenant-isolation.test.ts`; A: RLS-SQL manuell verifiziert | **PORT_SOURCE (A→T), RLS additiv** | A besitzt das einzige echte RLS-Modell (FORCE RLS, `app.tenant_id`); Ziel hat die Spaltenbasis. RLS additiv + Tests, kein Schema-Bruch |
| RBAC | Ja (8 Rollen, ~150 Permissions, de facto Owner) | T + A (9 Tenant-Rollen) | T2/A2 | T: rbac; A: requireTenantContext | **MERGE (T-Rollensatz + A-Tenant-Rollen)** | Ziel-Permissions-Set ist ausgereift; A-Rollen in Tenant-Kontext übernehmen; Owner = Default-Tenant-Rolle |
| Onboarding | Teilweise (aus Daten gesehen: onboarding-Routen nur in A/P) | A | A1/T1 | A: keine Tests | **PORT_SOURCE (A-Konzept → T)** | Single-Owner-Erstlauf + Organization-Onboarding; low risk, später Stufe |
| Single-Owner-Modus | Ja (De-facto owner only) | T (+C: OwnerProfile) | T2 | T: auth-tests | **KEEP_TARGET + C-OwnerProfile-Felder** | Controlled Default-Tenant (Phase 70); OwnerProfile (Währung/EUR) aus C ergänzt TenantConfig |
| BYOK | Ja (env + EncryptedCredential AES-256-GCM) | T + C (Keychain-Referenz) | T2/C2 | T: encryption-Tests | **MERGE (T-DB-Verschlüsselung + C-Keychain-Referenz)** | T speichert Cipher-Text mit Key-Versionen; C ergänzt OS-Keychain und maskierte Referenzen; keine Klartext-Keys |
| OmniRoute | Nein | C (Provider-Router free-first/balanced/premium/manual) | C2 | C: core.test.ts (Router) | **PORT_SOURCE (C-Router → T-Registry)** | Ziel-Registry + C-Routing-Strategie; Free-First-Regel der Organisation |
| Affiliate-Produkte | Ja (Product-Domain, Scoring, Research) | T | T3 (Logik, Mock-Daten) | T: 12 Produkt-Testdateien | **KEEP_TARGET** | Ziel hat vollständige Product-Domain (Compliance, Fit, Dedup, Opportunity-Scoring) |
| Affiliate-Netzwerke | Ja (8 Netzwerke, Mock) | T (+A connectors) | T1 | T: affiliate csv-import-Test | **MERGE (T-Registry + A-Connector-Muster)** | T hat Registry + CSV-Import; A liefert Connector-Struktur; alles Test-Double bis LIVE-Freigabe |
| Kampagnen | Ja (Campaign-Modell, campaign-factory) | T + A (Slice) | T2 | T: factory-Tests; A: contracts.test | **MERGE (T-Factory + A-Slice-Statusflow)** | T: Strategie/Winkel/Claim-Briefing; A: tenant-autoritative Zustands- und Approval-Kette |
| Content Factory | Ja (products/campaign-factory/content-intelligence) | T | T2 | T: mehrere Tests | **KEEP_TARGET** | Ziel-Module decken Factory ab (Produkt→Brief→Script); kein External-Code nötig |
| Script Studio | Ja (Script/ScriptVersion, Hooks, Briefs) | T + C (Hook-Model) | T2 | T: scripts-service | **MERGE (T-Script + C-Hook-Erweiterung)** | T hat Versionierung + sceneList; C bringt Hook als eigenständige Entität mit Qualitätsankern |
| Hook-Generierung | Ja (content/hooks) | T | T2 | T: hooks-API | **KEEP_TARGET** | vorhanden und getestet |
| Video Studio | Teilweise (VideoJob, kein Composer) | C (VideoProject-Statusmaschine) | T1/C1 | C: core/phase9-Tests | **PORT_SOURCE (C-Statusflow → T-VideoJob)** | Kosten-/Approval-/Quality-Zustände aus C auf VideoJob projizieren; kein echter Generator |
| Pexels | Nein | A (B-Roll-Mock) / nichts Echt | 0 | – | **REWRITE (neuer Adapter, TEST_DOUBLE_DEFAULT)** | keine bestehende Implementierung; als offizieller, dokumentierter Adapter bauen |
| HeyGen | Nein (nur Schema-Enum) | – | 0 | – | **REWRITE (neuer Adapter)** | nur Enum im Ziel; Avatar-Adapter später, nur mit offizieller dokumentierter API |
| Vidnoz | Nein | – | 0 | – | **REWRITE (manueller Export/Import-Workflow)** | kein offiziell dokumentierter SaaS-Adapter vorhanden → keine erfundenen Endpunkte; manueller Workflow |
| Composer | Nein | C (Statusmaschine) / A (video-production-runtime) | C1/A1 | C: phase9 | **PORT_SOURCE (C-Statusmaschine → T) + internes Composer-Rendering als Test-Double** | keine echte Render-Engine in keiner Quelle; Rendering-Schicht mit Test-Double, keine automatische kostenpflichtige Fallback-Generierung |
| Creator-Management | Teilweise (ContactRequest/Notification) | A (creator-marketplace, lead-agent) + P | A1 | A: keine | **PORT_SOURCE (A-Konzept → T)** | manuelle Eskalation, keine automatische Beauftragung/Zahlung |
| Creator-Eskalation | Nein | A (creator-marketplace) | A1 | – | **REWRITE (manueller Eskalationsprozess)** | explizit manuell (Vorgabe); Workflow-Gates statt Automatik |
| Social Accounts | Ja (SocialAccount, 8 Plattformen, MOCK/LIVE) | T | T2 | T: domain-Publishing-Tests | **KEEP_TARGET** | Modell mit mode-Trennung vorhanden |
| Publishing | Ja (PublishJob durable, Worker, Backoff) | T | T2 | T: queue/job-policy-Tests + e2e | **KEEP_TARGET** | einzige durable Queue mit Worker-Auth |
| Analytics | Ja (Events, Metriken, Sync, Jobs) | T (+C) | T2 | T: 2+ Testdateien + jobs | **KEEP_TARGET (optional C-Kohorten)** | Ziel-Analytics ist am breitesten; C ergänzt Kohorten/ROI-Lernen später |
| Attribution | Ja (commerce-core: Last-Touch, Profitability) | T (unwired) + A (attribution) + C | T2 (unwired) | T: 74/74 commerce-core-Tests | **MERGE + VERDRAHTEN** | commerce-core ist getestet aber nicht verdrahtet (fehlende Prisma-Modelle); Verdrahtung als Additiv-Migration |
| Finance | Teilweise (Revenue/Expense/Tax/Policy) | C (Ledger/Budgets/Forecasts) | T1/C2 | C: phase12; T: finance-utils | **PORT_SOURCE (C-Finance-Stamm → T)** | C besitzt einziges reifes Finance-Modul (Ledger, decimal.js, Budgets, Forecasting) |
| Kostenkontrolle | Ja (Approval, Budget-Gates, Workflows) | T + C (Envelopes) | T2/C2 | T: budgets/approvals-e2e | **MERGE (T-Gate + C-Envelope/Freigabe-Token)** | T: strukturelle Gates; C: Cost-Envelopes + ApprovalTokenHash ergänzen; verhindert Budgetlimit-Umgehung |
| Compliance | Teilweise (data-quality, anomaly) | C (quality-compliance-Package) | T2/C2 | C: phase10; T: quality-jobs | **PORT_SOURCE (C-Quality-Regeln → T)** | einzige Quelle mit versionierten Regeln + Scoring; fail-closed |
| Claim-Prüfung | Nein | C (claims/evidence/disclosures) | C2 | C: phase10 | **PORT_SOURCE (C-Claim-Engine → T)** | Claim-Gate vor Publishing; einzige Quelle |
| Asset-Provenienz | Teilweise (MediaAsset) | C (media-checks) | C1 | C: phase10 | **PORT_SOURCE (C→T MediaAsset-Erweiterung)** | Herkunfts-/Lizenzfelder + Nachweis-Hashes additiv |
| Lizenzprüfung | Nein | C (media/licensing) | C1 | C: phase10 | **PORT_SOURCE (C→T)** | kommerzielle Rechte fail-closed prüfen |
| Queue | Ja (PublishJob-Queue, Postgres-Leases) | T + C (Outbox) | T2 | T: queue-Tests | **MERGE (T-Queue + C-Outbox-Muster)** | C-Outbox (Idempotenz, Batches) auf T-Basis portieren |
| Worker | Ja (Worker-Routes, WORKER_SECRET) | T | T2 | T: worker-auth | **KEEP_TARGET** | vorhanden |
| Webhooks | Teilweise (PublishJob-Events) | C (webhook-security) | C1 | C: security | **PORT_SOURCE (C-Webhook-Verifikation → T)** | Signaturprüfung + Replay-Schutz additiv |
| Agenten | Ja (capability-registry, routing, tool-gateway) | T (+A agentos) | T2 | T: agents-Tests | **KEEP_TARGET** | Ziel-Agenten-Runtime ist die einzige mit Gateways/Approval-Denials |
| Workflows | Ja (state-machine, postgres-adapter) | T (+C automation) | T2 | T: 5 Workflow-Testdateien | **MERGE (T-Workflow + C-Scheduler/Idempotenz)** | T hat Engine; C hat Scheduler/Leases/Idempotency-Keys |
| Desktop-App | Nein | C (Tauri 2) | C2 | C: phase13, desktop.yml | **PORT_SOURCE (deferred, Phase 80 letzter Schritt)** | optional; Keychain-Secret-Speicher + signierte Updates als Muster, kein Zweit-App-Kern |
| Admin | Ja (app/admin-Bereiche) | T | T2 | T: e2e | **KEEP_TARGET** | vorhanden |
| Observability | Teilweise (audit, systemd, worker-jobs) | T + A (monitoring) + C (audit) | T2 | T: audit-tests | **MERGE (T-Basis + A-Metrik-Muster)** | Audit/Logs additiv; KPI-Exposition |
| CI/CD | Ja (ci.yml validate+e2e, Dependabot) | T | T2 | CI: grün dokumentiert | **KEEP_TARGET + Consolidation-Security-Jobs** | CI erweitern statt ersetzen |
| Deployment | Ja (Vercel + systemd-Timer) | T | T2 | deploy-Skripte vorhanden | **KEEP_TARGET (Docker optional später)** | kein Dockerfile im Ziel; docker-compose der A nicht übernehmen (pnpm/Next-Mismatch) |
| Dokumentation | Ja (CODEX, ADRs, Roadmaps) | T | T2 | – | **KEEP_TARGET + consolidate docs** | Inventar/Matrix/Gate-Docs legen unter docs/consolidation/ ab |

## Quellenzuordnung je Entscheidung (Zusammenfassung)

| Entscheidung | Elemente | Quelle(n) |
|---|---|---|
| KEEP_TARGET | Auth-Kern, RBAC-Permissions, Produkt-Domain, Content Factory, Script/Hooks, Social/Publishing, Analytics, Queue/Worker, Agenten, Workflows, Admin, CI/CD, Deploy, Docs | T |
| PORT_SOURCE | Tenant-RLS (A), Onboarding (A), OmniRoute-Router (C), Video-Statusflow (C), Creator-Management (C/A), Finance-Stamm (C), Quality/Compliance/Claims/Provenienz/Lizenz (C), Webhook-Security (C), Desktop-Shell (C, deferred) | A, C |
| MERGE | RBAC-Rollen (T+A), BYOK (T+C), Kampagnen (T+A), Script+Hook (T+C), Attribution-Verdrahtung (T+C), Kosten-Gates (T+C), Queue+Outbox (T+C), Workflows+Scheduler (T+C), Observability (T+A) | T+A, T+C |
| REWRITE | Pexels, HeyGen, Vidnoz, Composer-Render, Creator-Eskalation (Ablauf) | neu (mit Test-Doubles), Vidnoz manuell |
| REJECT_INSECURE / REJECT_DUPLICATE | Drizzle-Welt, better-auth, Vite-SPA, center-main, who-knows-enterprise, center-packages-als-NodeModules | A(ORM/Auth), CM, W |
| ARCHIVE_ONLY | compute-the-platform-to-build-zd, one-user-ugc-affiliate-center-main | P, CM |

## Reihenfolge der Migration (Phase 80-Zuordnung)

1. Auth-, Tenant-, RBAC-Grundlagen (MERGE/PORT: RLS, Rollen, Single-Owner-Tenant)
2. Approval- und Kostenkontrolle (MERGE: Envelopes, Token-Hash, Budget-Gates)
3. Provider-Runtime und BYOK (MERGE: Registry + Router + Keychain-Referenz)
4. Affiliate-Produkte und Netzwerke (KEEP + Connector-Muster aus A)
5. Kampagnen (MERGE: Factory + Slice-Statusflow + RLS-Tenant)
6. Content Factory (KEEP, Hook-Erweiterung aus C)
7. Script Studio und Hooks (MERGE)
8. UGC Video Studio (PORT: C-Statusmaschine, REWRITE-Adapter mit Test-Doubles)
9. Claims, Compliance und Provenienz (PORT aus C, Claim-Gate verdrahten)
10. Social Publishing (KEEP + Human-Review-Gate vorhanden)
11. Analytics und Attribution (KEEP + Verdrahtung commerce-core)
12. Finance (PORT: Ledger/Budgets aus C auf T-Finance-Modelle)
13. Creator-Management und Eskalation (PORT/REWRITE manuell)
14. Agenten und Workflows (MERGE: Outbox/Scheduler aus C)
15. Optionale Desktop-Shell (PORT aus C, deferred)