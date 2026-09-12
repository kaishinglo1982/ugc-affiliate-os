# Repository-Inventar – UGC Affiliate OS Konsolidierung

**Datum:** 2026-08-18
**Erstellt auf Branch:** `agent/consolidate-all-ugc-projects` (Basis: `master` @ `5f38509`)
**Auftrag:** Phase 20 – Vollständiges Repository-Inventar

## Übersicht aller geprüften Repositories im Konto kaishinglo1982

| # | Repository | Sichtbarkeit | Größe (kBDisk) | Standardbranch | Letzter Push | UGC-Zugehörigkeit |
|---|-----------|--------------|----------------|----------------|--------------|-------------------|
| 1 | **ugc-affiliate-os** (Ziel) | PRIVATE | 2.363 | `master` | 2026-08-17 | **JA – Zielsystem** |
| 2 | ugc-affiliate-agency | PUBLIC | 49.867 | `master` | 2026-07-29 | **JA – Quelle** |
| 3 | one-user-ugc-affiliate-center | PRIVATE | 595 | `main` | 2026-08-04 | **JA – Quelle** |
| 4 | one-user-ugc-affiliate-center-main | PRIVATE | 49.941 | `master` | 2026-07-29 | **JA – Backup/Snapshot** |
| 5 | compute-the-platform-to-build-zd | PRIVATE | 49.732 | `main` | 2026-07-06 | **JA – früher Prototyp (v0-Export)** |
| 6 | who-knows-enterprise | PRIVATE | 58.826 | `main` | 2026-07-04 | **NEIN – anderes Produkt (Streetwear "Who Knows")** |
| 7 | NCH-Agency- | PRIVATE | 1.294 | `main` | 2026-08-17 | NEIN – Eventagentur |
| 8 | Noir-Agency | PRIVATE | 8.157 | `main` | 2026-07-30 | NEIN – Eventagentur |
| 9 | noir-agency-impl | PRIVATE | 83 | `main` | 2026-07-29 | NEIN – Eventagentur (Impl) |
| 10 | escort-agency-os | PRIVATE | 381 | `main` | 2026-07-31 | NEIN – anderes Produkt |
| 11 | Carry-OS | PRIVATE | 14.916 | `main` | 2026-07-17 | Plattform-Konzept (kein UGC-Code) |
| 12 | carryos | PRIVATE | 15.954 | `main` | 2026-08-01 | Plattform-Konzept (kein UGC-Code) |
| 13 | SHK-Office-Edition | PRIVATE | 7.153 | `master` | 2026-07-31 | NEIN – Branchenedition SHK |
| 14 | finance-app | PRIVATE | 59 | `v0/kaishinglo1982-5412-8000dbf2` | 2026-07-09 | NEIN – generiertes Testprojekt |
| 15 | Trading-Dashboard | PRIVATE | 75 | `main` | 2026-05-03 | NEIN |

Kein Repository im Konto hat **Git-Tags**. Alle UGC-Quellen haben unverschmutzte Working Trees (keine uncommittierten Änderungen), mit Ausnahme des Zielrepos (siehe unten).

---

## 1. Zielrepository: ugc-affiliate-os

| Feld | Wert |
|------|------|
| URL | https://github.com/kaishinglo1982/ugc-affiliate-os |
| Sichtbarkeit | PRIVATE |
| Standardbranch | `master` |
| Master-HEAD (Inventarzeitpunkt) | `5f38509bddf2c577ef187feb9e256f448043ecd5` – "feat: HuggingFace integration settings with model selection and tips" (2026-08-04) |
| Remote-Branches | `master`, `agent/ugc-commerce-core`, `hardening/multi-tenancy-10`, `phase-1-foundation-swarm`, `phase-10-6-7-budget-approval-gates`, `phase-10-agentic-automation`, 12 dependabot-Branches |
| Tags | keine |
| Offene PRs | 12 offen: 10 Dependabot, `phase-1-foundation-swarm` (Draft), `phase-10-6-7-budget-approval-gates` (Draft #19), `hardening/multi-tenancy-10` (Draft #18) |
| Merge-Status | PR #11 (Agentic Automation), #13/#14 (Deps), #12/#16 (Deps, closed) gemerged; Drafts #9/#18/#19 nie gemerged |
| Repositorygröße | 2.363 KB (Git-Objekte ~1.63 MiB pack) |
| Uncommittierte Änderungen (lokal) | `package.json`, `pnpm-lock.yaml` – lokaler TS-7.0.2→6.0.3-Experiment von `agent/ugc-commerce-core` (Stand 2026-08-18). **Nicht übertragen, nicht überschrieben.** |
| Package Manager | pnpm 11.13.0 (Corepack), `packageManager: pnpm@11.13.0` |
| Node-Version | `>=20.9.0 <25` (lokal v22.23.2) |
| Next.js / React | **Next 16.2.10** / React 19.2.4 |
| TypeScript | 6.0.3 lokal (getrackt: ^7.0.2, TS7-Experiment) |
| Datenbank / ORM | PostgreSQL, **Prisma 7.8.0** (`@prisma/adapter-pg`), 10 Migrationen, 126 Modelle |
| Authentifizierung | Eigenes JWT-System (`jose` HS256, `bcryptjs`), Cookie `ugc_session`, Session-Modell mit `tokenHash`; kein NextAuth. `src/lib/auth/session.ts`, `rbac.ts`, `current-user.ts` |
| RBAC | 8 Rollen (viewer…owner), ~150 Permissions, de facto Single-Owner (`roleForUser()` → immer `owner`) |
| Tenant-Modell | Kein Tenant-Modell, kein RLS. `workspaceId`-Spalten auf fast allen Modellen; `WorkspaceConfig` Single-Workspace; CarryOS-Bridge-Header `x-carryos-tenant-token` (`src/lib/auth/tenant.ts`) |
| API-Routen | ~25 Gruppen unter `src/app/api/` (auth, content, media, publishing/worker, analytics/jobs, agents/run, approvals, budgets, …) |
| Queue / Worker | Kein BullMQ. Polling-Worker-APIs (`api/publishing/worker`, `api/analytics/jobs/run`) + systemd-Timer (`deploy/*.timer`) |
| Agenten-Runtime | `src/lib/agents/` (Capability-Registry, Postgres-Capacity-Router, Tool-Execution-Gateway), `src/lib/workflows/` (State-Machine, Postgres-Adapter, Step-Claim) |
| Provider / BYOK | `src/lib/providers/` (video, llm, affiliate, social, storage). Alle Video-/Affiliate-/Social-Provider Mock; echte S3-Storage. `EncryptedCredential`-Modell mit AES-256-GCM (`src/lib/encryption/aes.ts`), BYOK per ENV + DB-Credential-Referenzen. Provider-Keys: HIGGSFIELD, RUNWAY, KLING, VEO, HEYGEN, ELEVENLABS, CUSTOM, MOCK |
| Content Factory | `src/features/campaign-factory/`, `src/features/products/` (Domain + Application), `src/features/content-intelligence/` |
| Script Studio | `src/app/app/scripts/`, `src/app/app/content/hooks/`, `src/app/app/content/briefs/`, `Script`/`ScriptVersion`-Modelle (Hook-Struktur, sceneList) |
| Video Studio | `src/app/app/videos/`, `VideoJob`-Modell, Hook-Polling, sonst kein Composer |
| Affiliate-Netzwerke | Amazon, eBay, AWIN, CJ, Impact, Rakuten, ShareASale, Digistore24 (alle Mock – `affiliate/registry.ts`) |
| Social Publishing | `SocialAccount` (8 Plattformen, mode MOCK/LIVE), `SocialPost`, `PublishJob` (durable Queue, Backoff, DEAD), nur Mock-Adapter |
| Analytics | `src/lib/analytics/` (Events, versionierte Metriken), `src/features/analytics/` (Sync, Aggregation, Anomaly, Data-Quality), Experimentation, Content-Intelligence, Recommendation |
| Finance | Modelle Revenue/Expense/TaxSetting/BudgetPolicy, `src/lib/finance/` (calculations/format), Approval-Modell (48 Resourcetypen, cost/currency/expiresAt), Budget-Gates |
| Desktop-App | **Keine** |
| Tests | **44 Unit/Integration** (Vitest 4.1.10) + **8 E2E-Specs** (Playwright 1.61.1) |
| CI/CD | `.github/workflows/ci.yml` (validate + e2e, Postgres-Service), Dependabot; Vercel (`vercel.json`) + systemd-Timer deploy |
| Deployment | Vercel (Next), systemd-Cron-Timer, kein Dockerfile |
| Dokumentation | AGENTS.md, CLAUDE.md, CODEX.md (CarryOS-Plan Bands 10–17), `docs/` (Architektur-ADRs, Roadmaps, Phasenberichte PHASE1_4/2_4/6/7) |
| Bekannte Buildfehler | Lint durch TS7/ESLint-Inkompatibilität lokal blockiert (laut EXECUTION_STATE.md); lokale TS6-Downgrade-Absicht |
| Secrets | Keine Secrets in getrackten Dateien; `.env.example` getrackt; lokales `.env` ungetrackt |

---

## 2. Quelle: ugc-affiliate-agency

| Feld | Wert |
|------|------|
| URL | https://github.com/kaishinglo1982/ugc-affiliate-agency |
| Sichtbarkeit | PUBLIC |
| Standardbranch | `master` |
| HEAD | `947be58139d593ef00be6bdc09befa742ac8aaae` – "feat(ugc): tenant-authoritative campaign and approval slice" (2026-07-29) |
| Branches | `master`, `feat/affiliate-campaign-content-slice`, `feat/auth-multitenancy`, `feat/session-tenant-campaign-slice`, `feat/ugc-swarm-foundation-batch-01` |
| Tags | keine |
| Offene PRs | 0 offen; 4 gemergt/geschlossen (Auth-Multitenancy, Swarm-Batch, Campaign-Slices) |
| Größe | 49.867 KB |
| Uncommittierte Änderungen | keine (Working Tree clean) |
| Package Manager | pnpm (lock vorhanden); Dockerfile nutzt fälschlich `npm ci` (bekannter Konflikt) |
| Node-Version | node:22 (Dockerfile) |
| Next.js / React | **Next 15.5.20** / React 19.0.0 |
| TypeScript | latest (strict) |
| Datenbank / ORM | PostgreSQL, **Drizzle ORM 0.45.2** + `pg`; SQL-Migrationen `drizzle/0001_…` bis `0002`, `migrations/0001_ugc_swarm_rls.sql`–`0003_business_tenant_authority.sql` |
| Authentifizierung | **better-auth 1.6.23** + organization-Plugin, Auth-Session 7d, Invitations |
| RBAC | 3 Org-Rollen (owner/admin/member) + 9 Tenant-Mitgliedsrollen (owner…service_account); `requireTenantContext()` |
| Tenant-Modell | **Autoritativ**: `tenants`-Tabelle, `tenant_memberships`, RLS + FORCE RLS mit `current_setting('app.tenant_id')` auf Slice- und Swarm-Tabellen; `tenant-context.ts` |
| API-Routen | `api/auth/[...all]`, `api/health`, `api/readiness`, `api/v1/agents/*` (echte Gemini-Calls), `api/v1/ugc/campaigns`, `api/v1/ugc/approvals/[approvalId]` |
| Queue / Worker | BullMQ (Konfig in Swarm-Queue), Redis (docker-compose.production) |
| Agenten-Runtime | `src/lib/agentos/` (Registry, Orchestrator, Memory, Permissions, Events), `src/lib/agents/` (Funktions-Agents), `src/lib/swarm/` (~55 Dateien: execution-engine, workflow-runtime, provider-mesh, tool-gateway, …) |
| Provider | Alle Mock-Adapters (`video-providers`, `voice-providers`, `platform-connectors`, `affiliate-connectors`, …); einzige echte Integration: Google Gemini über `@ai-sdk/google` (env-Key) |
| BYOK | nicht ausgeprägt (env-basiert) |
| UGC-Module | script-studio, ugc-studio, publishing, analytics, finance, tax, crm, automation, notifications, admin/ugc-agency UI; `src/lib/ugc/` Vertical Slice (Kampagnen, Approvals) |
| Content Factory | `src/lib/swarm/media-pipeline.ts`, `src/lib/agency/video-agent.ts`, admin/content UI |
| Creator-Management | `creator-marketplace.ts` (Swarm), lead-agent |
| Social Publishing | `social-publishing.ts`, `platform-connectors.ts` (8 Plattformen, Mock) |
| Analytics | `business-intelligence.ts`, `attribution.ts` (Swarm), analytics-agent |
| Finance | `finance-settlement.ts`, cfo-agent, tax-agent, `accounting-export.ts`, `expense-importers.ts` |
| Desktop-App | keine |
| Tests | 4 Vitest-Dateien (unit/integration/e2e/governed-e2e, contracts) |
| CI/CD | **Kein `.github/`** – kein CI-Workflow; Vercel (`vercel.json`), Dockerfile + docker-compose(.production) |
| Deployment | Vercel bzw. Docker (Next standalone, Postgres 17, Redis 7) |
| Dokumentation | README (deploy-ready), docs/ (BAND_2_COMPLETION_REPORT, MASTERPROMPT, ROADMAP, audits, implementation) |
| Bekannte Schwächen | RLS nicht im Swarm-Drizzle-Pfad aktiviert (`app.tenant_id` fehlt dort); Dockerfile/`npm ci` inkompatibel mit pnpm-lock; kein CI; Mock-Provider als "swap-later"-Marker |
| Secrets | nur `.env.example`, `.env.production.example` getrackt; kein Key-Scan-Treffer |

---

## 3. Quelle: one-user-ugc-affiliate-center

| Feld | Wert |
|------|------|
| URL | https://github.com/kaishinglo1982/one-user-ugc-affiliate-center |
| Sichtbarkeit | PRIVATE |
| Standardbranch | `main` |
| HEAD | `ecdbdb7c3e251d6e6c6910994abe5dadedfba30c` – "feat: add missing demo data module for dashboards" (2026-08-04) |
| Branches | `main` + `agent/phase-10…17` (8 Feature-Branches, alle hinter main) |
| Tags | keine |
| PRs | #9 gemergt (Phase 17); #1–8 DRAFT und **stale** (Branches hinter `main`, Arbeit direkt auf main gepusht) |
| Größe | 595 KB |
| Uncommittierte Änderungen | keine |
| Package Manager | **npm 10** (`packageManager: npm@10`), `package-lock.json` |
| Node-Version | >=20 |
| Next.js / React | **Kein Next** – Vite 8 SPA (react-router-dom 7.18), React 19.2.7 |
| TypeScript | ^5.7.2 |
| Datenbank / ORM | PostgreSQL, **Prisma 6.12**, 2 Migrationen, **37 Modelle** |
| Architektur | Monorepo-artig: `apps/web` (Vite-SPA), `apps/desktop` (**Tauri 2**, Rust), `packages/*` (8: ai-studio, analytics, automation, database, finance, quality-compliance, release, security) |
| Authentifizierung | **Keine Account-Auth** (explizit Single-User); lokale PIN-Sperre (`OwnerAccessController`, scrypt), Sessions/CSRF-Token, Secret-Redaction |
| RBAC | keine (bewusst) |
| Tenant-Modell | **Keins** – ADR-0001 "single-user domain"; `OwnerProfile` Singleton (EUR, timezone) |
| Video-Pipeline | Modelle komplett (ContentBrief→Hook/Script→Storyboard→VideoProject→MediaAsset) mit Kosten-/Approval-Statusmaschine (DRAFT→…→PUBLISHED), `QualityMode`, Cost-Envelope; **kein Composer/Generator**, keine echten Provider-Calls |
| Provider | Nur Adapter-Contracts (Claude, Gemini, DeepSeek, OpenRouter, Higgsfield, Kling, Veo, Runway, Seedance, ElevenLabs); `ProviderCredential` mit `encryptedSecretReference`; PRODUCTION-Modus verbietet Nicht-OFFICIAL-Adapter |
| Kosten-/Freigabe | `ApprovalRequest` (actionType, provider, estimated min/max Cost, approvalTokenHash, expiresAt, FREE-ALT-Flag, Status PENDING…CONSUMED); Budget-Envelopes, Human-in-the-Loop |
| Automation | `packages/automation`: Schedules, Idempotency-Keys, Outbox, Batches, Scheduler-Leases (DB) |
| Quality/Compliance | `packages/quality-compliance`: versionierte Regeln, Claims/Evidence, Disclosures (fail-closed) |
| Analytics | deterministisch (Attribution, Kohorten, Empfehlungen) auf importierten Daten |
| Finance | `packages/finance`: Ledger, Budgets (warning/hard-stop), Forecasts, decimal.js; Revenue/Cost entries mit estimated/reserved/actual |
| Security | AES-256-GCM (Key-Versionen, AAD), Hashing, Tokens, Rate-Limit, Audit, Webhooks, Queue, Resilience |
| Desktop-App | **Tauri 2**: Dateidialoge (Traversal-Schutz), OS-Secret-Store (Keychain), signierte Updates, Backups mit Checksummen |
| Tests | 17 Testdateien (Phasen 0–17), inkl. Golden-E2E (33 Steps), Performance, Security |
| CI/CD | 5 Workflows: ci, automation, phase17-hardening, desktop (Matrix), release-v1 (Evidence-Gates) |
| Deployment | Vercel (vite, SPA-Rewrites) + Tauri-Desktop-Pakete; V1-Release **blockiert** (echte Adapter fehlen) |
| Bekannte Blockers | Keine echten Provider-/Publishing-/Video-Ausführungen; V1 nur bei Evidence-grünen Gates; durable Migrationen/Restore ausstehend |
| Secrets | nur `.env.example`; kein Key-Scan-Treffer |

---

## 4. Quelle: one-user-ugc-affiliate-center-main (Backup)

| Feld | Wert |
|------|------|
| URL | https://github.com/kaishinglo1982/one-user-ugc-affiliate-center-main |
| Sichtbarkeit | PRIVATE |
| Standardbranch | `master` |
| HEAD | `e24bc298e0e67072fabfb24d56552036aeeb3e2b` – "Initial commit: one-user-ugc-affiliate-center implementation" (2026-07-29), **einziger Commit** |
| Branches / Tags / PRs | keine (nur `master`) |
| Größe | 49.941 KB |
| Charakter | **Snapshot/Export eines früheren Stands** von one-user-ugc-affiliate-center + Prompt-Pack (doppelt verschachtelt) + generierte Tauri-Artefakte (gen/, icons/) + fremde Kopie `who-knows-enterprise` im Prompt-Pack |
| Abweichungen gegenüber center | 15 statt 37 Prisma-Modelle; nur 1 Migration; keine `src/`-Struktur in apps/web (nur app/components/out); keine dashboard/approvals/settings-Routen; packages/ai-studio ohne package.json; ADRs 0002–0005 fehlen |
| Verifizierte Relation | **Backup, kein Fork** – keine gemeinsame Git-Historie (einzelner Squash-Commit), Dateibäume überlappend aber unterschiedlicher Stand |
| Secrets | keinerlei Secret-Dateien getracket |

---

## 5. Früher Prototyp: compute-the-platform-to-build-zd

| Feld | Wert |
|------|------|
| URL | https://github.com/kaishinglo1982/compute-the-platform-to-build-zd |
| Sichtbarkeit | PRIVATE |
| HEAD | `fc2e048` "Configure Vercel pnpm build" (2026-07-06), **3 Commits, ein v0-Export** (`prj_Z3AKbM4iBnCmefLaK6JHKSI4LOyu`) |
| Größe | 49.732 KB |
| Stack | Next 15.5.20, React 19, Drizzle (Schema-Fragment), better-auth (lazy, `as any`), ai/@ai-sdk/google, zustand |
| Inhalt | "UGC Affiliate Agency Enterprise" – Band-2-Report, 11 `/ugc-agency`-Module (script-studio, ugc-studio, publishing, analytics, finance, tax, crm, automation, notifications, admin, white-label), 10 Agency-Agenten, `src/data/enterprise.ts` (970 Z. Mock), öffentliche `/ugc-affiliate`-Shop-Seiten |
| Besonderheit | DB lazy (null ohne DATABASE_URL), Admin ungeschützt, 122 src-Dateien, **Grundlage der ugc-affiliate-agency** (identische Dateien per Hash verifiziert) |

## 6. Nicht-UGC: who-knows-enterprise

| Feld | Wert |
|------|------|
| URL | https://github.com/kaishinglo1982/who-knows-enterprise |
| HEAD | `3f1a9f9` (2026-07-04), ~30 v0-Commits, derselbe v0-Projekt-Link wie compute |
| Inhalt | CarryOS-Modul "Who Knows Enterprise": Streetwear-Shop (products/drops/waitlist/checkout, **echte Drizzle-Queries**), UGC-Video-Center-Stub, Agenten, admin/who-knows |
| Bewertung | **Kein UGC-Affiliate-Produkt**; Schwester-Zweig derselben v0-Basis. Kein Affiliate-/Commission-/Creator-System |

---

## Umgebungs-Parameter (Gate 0)

| Werkzeug | Version | Status |
|----------|---------|--------|
| git | 2.47.3 | OK |
| node | v22.23.2 | OK |
| corepack | 0.34.6 | OK |
| pnpm | 11.13.0 | OK |
| npm | 10.9.8 | OK |
| gh | 2.97.0 | OK, angemeldet als kaishinglo1982 (Scopes: gist, read:org, repo, workflow) |

## Sicheres Arbeitsverzeichnis

```
ugc-consolidation/
├── target/ugc-affiliate-os/        → Symlink auf /home/kaishinglo1982/ugc-affiliate-os
└── sources/
    ├── ugc-affiliate-agency/                    (read-only)
    ├── one-user-ugc-affiliate-center/           (read-only)
    ├── one-user-ugc-affiliate-center-main/      (read-only)
    └── discovered/
        ├── compute-the-platform-to-build-zd/    (read-only)
        └── who-knows-enterprise/                (read-only)
```

Alle Quellen wurden frisch geklont und nur lesend behandelt. Commit-IDs der Quellen sind oben dokumentiert.