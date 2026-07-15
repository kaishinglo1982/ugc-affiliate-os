# Phase 6 — Abschlussbericht: Analytics, Content-Intelligence, Experimentation & Automatisierte Optimierung

**Projekt:** UGC Affiliate OS
**Datum:** 2026-07-14
**Status:** Implementiert, typsicher, getestet, Build grün. (Migration noch nicht gegen eine Datenbank ausgeführt — siehe „Offen".)

---

## 1. Zusammenfassung

Phase 6 erweitert das System um ein vollständiges, datenschutz- und compliance-orientiertes
Analyse- & Optimierungssystem. Es umfasst:

- **Analytics** mit normalisierten Metriken, versionierten Kennzahlformeln, Event-Pipeline
  (Ingest → Deduplizierung → Sync → Aggregate) und qualitätsbewusster Darstellung (null ≠ 0).
- **Content-Intelligence** mit strukturierter, versionierter Content-Analyse und immutablen
  Content-Varianten.
- **Experimentation** (A/B, Multivariate, MAB, Hold-out) mit statusgesteuertem Freigabe-Workflow,
  deterministischer, idempotenter Zuweisung und konservativer, frequentistischer Analyse.
- **Automatisierte Optimierung** als reine Empfehlungs-Engine (kein Auto-Apply), gesteuert durch
  beobachtungs-default Richtlinien (Opt-in für KI).

Die Architektur trennt strikt **Domain (kein Next.js/Prisma/React)**, **Ports (Provider-Agnostik)**,
**Application Services** und **Infrastructure (API-Routen, Worker)**. Alle Mutationen sind
workspace-isoliert, RBAC-abgesichert und auditierbar.

---

## 2. Architektur & Schichten

```
UI (Client-Dashboards)
   │ fetch
API-Routen (src/app/api/**)  ── Zod-Validierung, RBAC-Guard, Audit-Log
   │
Application Services (src/features/**)  ── Orchestrierung, keine UI-/Framework-Logik
   │
Domain-Libs (src/lib/analytics, experimentation, data-quality, anomaly,
            recommendation, content-intelligence, optimization)  ── rein, kein Prisma/Next
   │ (Ports)
Infrastructure (prisma, provider/mock, queue, observability, audit)
```

- **Domain-Regeln** liegen in `src/lib/**` und hängen von **keinem** Framework ab.
- **Ports** (`SocialAnalyticsPort`, Content-Intelligence-Port) ermöglichen Laternen/Mock/Live
  ohne Domänenänderung.
- **Alle Beträge/Ratios** nutzen `Prisma.Decimal` über den geteilten Wrapper `src/lib/shared/decimal.ts`.
- **tsconfig target** ist auf `ES2020` (BigInt-Literale) und strikt (`noImplicitAny`, `strict`).

---

## 3. Datenmodell (Prisma)

Phase 6 hat **24 Modelle** und **32 Enums** ergänzt (siehe `prisma/schema.prisma`), u.a.:

- `AnalyticsEvent`, `PlatformMetricSnapshot`, `AnalyticsSyncJob`, `AnalyticsProviderMapping`
- `ContentPerformanceSnapshot`, `ProductPerformanceSnapshot`, `PostingTimePerformance`
- `ContentIntelligenceProfile`, `ContentVariant`, `ContentAsset`, `Brand`, `Niche`
- `ContentExperiment`, `ExperimentVariant`, `ExperimentAssignment`, `ExperimentResult`
- `OptimizationRecommendation`, `OptimizationPolicy`, `AudienceSegment`
- `DataQualityReport`, `DataQualityIssue`, `AnalyticsAnomaly`, `OptimizationRule*` (inkl. Execution)

Alle neuen Modelle tragen `workspaceId` (Workspace-Isolation). Referenzen auf Vorgänger-Modelle
werden als skalare ID-Spalten ohne Back-Relation abgebildet (keine Änderung bestehender Modelle).

**Migration:** `prisma/migrations/20260714011437_phase6_analytics/migration.sql` (24 Tabellen, 32 Enums).
Generiert aus dem vollständigen Diff; auf Live-Adapter/Shadow-DB wurde in dieser Umgebung verzichtet.

---

## 4. Domänen-Engines (rein, getestet)

| Engine | Ort | Kernpunkte | Tests |
|---|---|---|---|
| Metriken | `src/lib/analytics/metrics.ts` | `safeRatio` null-sicher, versionierte Formeln, `computeContentMetrics` | 10 |
| Events | `src/lib/analytics/event.ts` | Zod-Validierung, `deduplicateEvents` | 7 |
| Provider | `src/lib/analytics/provider/*` | Mock-Adapter, Live-Skeleton, Fehlerklassifikation, Mapping | — |
| Experiment-Status | `src/lib/experimentation/status.ts` | Zustandsmaschine, Post-Start-Änderungserkennung | 12 |
| Zuweisung | `src/lib/experimentation/assignment.ts` | FNV-1a, gewichtet, deterministisch, idempotent | (status) |
| Analyse | `src/lib/experimentation/analysis.ts` | Zwei-Stichproben-Z-Test, Mindest-Stichprobe, prakt. Signifikanz, **kein Auto-Apply** | — |
| Datenqualität | `src/lib/data-quality/engine.ts` | Score-Breakdown, Issue-Erkennung | 5 |
| Anomalien | `src/lib/anomaly/rules.ts` | regelbasiert, neutral, Min-Sample-Gating | 5 |
| Empfehlungen | `src/lib/recommendation/rules.ts` | 5 Regeln, Deduplizierung, Nachvollziehbarkeit | 5 |
| Content-Varianten | `src/lib/content-intelligence/variant.ts` | Versionierung, Immutability, Secret-Sanitisierung | 5 |
| Profile | `src/lib/content-intelligence/profile.ts` | Zod-Schema, Konfidenz-Klassifikation, Manuell > Automatisch | — |
| Richtlinien | `src/lib/optimization/policy.ts` | Default **OBSERVE_ONLY** + Gates | 5 |

**Gesamt:** 54 Unit-Tests (vitest) — alle grün.

---

## 5. Application Services & API (Server-seitig)

- **Analytics:** `src/features/analytics/{sync,queries}.ts` — `requestSyncJob`, `importAnalyticsEvents`
  (idempotent), `processSyncQueue` (Worker, DLQ), `getAnalyticsOverview` u.a. Lesefunktionen.
- **Experimentation:** `src/features/experimentation/service.ts` — `createExperiment`,
  `requestExperimentApproval`, `approveExperiment`, `startExperiment`, `pauseExperiment`,
  `completeExperiment`, `analyzeExperimentById`, `assignExperimentJobs`.
- **Empfehlungen:** `src/features/recommendation/service.ts` — `generateRecommendations`,
  `listRecommendations`, `reviewRecommendation`, `createVariantDraftFromRecommendation`,
  `createExperimentDraftFromRecommendation`.
- **Content-Intelligence:** `src/features/content-intelligence/service.ts` — `analyzeContent`,
  `listVariants`, `createVariant`.
- **Optimierung:** Richtlinien-CRUD via API.

**API-Routen (alle mit `requireApiPermission` + Zod + Audit):**
`/api/analytics/{overview,content,sync,sync-jobs,data-quality,anomalies,anomalies/[id]}`,
`/api/experiments` (+ `[id]` und Aktionen `approve|start|pause|complete|analyze|assign`),
`/api/recommendations` (+ `[id]`), `/api/optimization/policies`,
`/api/content-intelligence` (+ `/variants`).

**RBAC:** `src/lib/auth/rbac.ts` definiert Permission/Rolle; Single-User-System gewährt dem Owner
alle Rechte. UI-Verbergung ersetzt niemals die serverseitige Prüfung.

---

## 6. Dashboards (Client, `/app/*`)

Über die Sidebar (`src/lib/app-nav.ts`) erreichbar, jeweils mit **Loading / Empty / Error**-Zuständen
und expliziter `null ≠ 0`-Behandlung:

- **Analytics** (vorbestehend, Phase 5) — Funnel/KPIs/Plattform-Breakdown.
- **Datenqualität & Anomalien** (`/app/data-quality`) — Qualitätsberichte + neutrale Anomalien.
- **Experimente** (`/app/experiments`) — Anlage, Freigabe-Workflow, Start/Pause/Complete/Analyze.
- **Empfehlungen** (`/app/recommendations`) — Generierung, Review/Accept/Reject, Entwurf-Erzeugung.
- **Content-Intelligence** (`/app/content-intelligence`) — Profil-Speicherung, Varianten.
- **Optimierungsrichtlinien** (`/app/optimization`) — Richtlinien (Default OBSERVE_ONLY).

---

## 7. Sicherheit, Datenschutz & Compliance

- **Keine Secrets/Tokens/Tracking-URLs** in Logs oder Queue-Payloads (`observability/metrics.ts`:
  `redact`/`redactText`).
- **Audit-Log** bei jeder Mutation (`audit/log.ts`, ~40 Phase-6-Aktionen in `audit/format.ts`).
- **Workspace-Isolation** (`DEFAULT_WORKSPACE_ID`) auf allen neuen Modellen und Queries.
- **Experimente:** Gewinner werden **nie** automatisch live geschaltet (nur Empfehlungsgrad).
- **Content-Varianten:** Veröffentlicht = immutable; Änderungen erzeugen neue Version.
- **Manuelle Klassifikation** wird nie automatisch überschrieben.
- **Prompt-Referenzen** dürfen keine Secrets enthalten (`sanitizePromptReference`).

---

## 8. Feature-Flags

`src/lib/config/feature-flags.ts`:

- Analytics: `SOCIAL_ANALYTICS_ENABLED=true`, `LIVE_ADAPTERS_ENABLED=false`,
  `BACKFILL_ENABLED=false`, `MANUAL_IMPORT_ENABLED=true`
- Content-Intelligence: `CONTENT_INTELLIGENCE_ENABLED=true`, `AI_ENABLED=false`,
  `VARIANT_AI_GENERATION_ENABLED=false`
- Optimierung: Standardmodus **OBSERVE_ONLY**, KI-Optionen aus (Opt-in).

Live-Adapter sind bewusst deaktivierte Skeletons; der Mock-Adapter und der manuelle Import sind aktiv.

---

## 9. Verifikation

| Gate | Befehl | Ergebnis |
|---|---|---|
| Typecheck | `pnpm typecheck` | ✅ sauber |
| Unit-Tests | `pnpm test` | ✅ 54/54 grün |
| Lint | `pnpm lint` | ✅ 0 Fehler (nur 31 vorhandene Warnungen, keine Errors) |
| Build | `pnpm build` | ✅ Exit 0 (alle neuen Routen/Seiten kompiliert) |
| **Vollständig** | `pnpm validate` | ✅ Exit 0 (typecheck + lint + test + build) |

---

## 10. Offen / Nächste Schritte

1. ✅ **Migration angewendet:** `pnpm db:migrate:deploy` gegen die lokale PostgreSQL
   (`ugc_affiliate_os`) — alle Migrationen (inkl. Phase 6, 24 Tabellen) erfolgreich angewendet;
   10 Stichproben-Tabellen verifiziert.
2. ✅ **Seed-Daten eingespielt:** `Brand` (`682f1f2f-ba52-4ada-adf8-27b2420b92ad`),
   `Niche` (`efb8b374-d2bb-4828-8eb9-1d84ccafd634`), `ContentAsset`
   (`bc66b86f-ab3d-4c63-8368-3432ae37fbaa`) im Default-Workspace. Experimente/Content-Intelligence
   können diese IDs nun im Dashboard nutzen.
3. ✅ **Vorbestehende Lint-Fehler** bereinigt (siehe unten); `pnpm lint` fehlerfrei.
4. **Live-Adapter** aktivieren sobald Provider-Credentials vorliegen; Payload-Ingest aus
   Post-Backs/Provider-APIs an `importAnalyticsEvents` anschließen (feature-flagged, Default aus).
5. **Backfill** aktivieren, sobald Historie vorhanden ist (feature-flagged, Default aus).
6. ✅ **Anomalie-Erkennung als Job** verdrahtet: `src/features/analytics/anomaly-job.ts`
   (`runAnomalyDetection`) vergleicht je Content-Asset mit der Workspace-Baseline (neutrale
   erwartete Bereiche), persistiert `AnalyticsAnomaly` (dedupliziert, nie auto-blockierend) und
   schreibt ein Audit-Log. Erreichbar per `POST /api/analytics/anomalies/detect` sowie dem
   Button „Anomalien scannen" auf `/app/data-quality`. Liefert ohne Snapshot-Daten 0 Treffer
   (korrekt), läuft automatisch sobald Performance-Daten fließen.
7. ✅ **Datenqualitäts-Report-Generator** verdrahtet: `src/features/analytics/data-quality-job.ts`
   (`runDataQualityScan`) speist live Signale (Anzahl Snapshots, gefüllte Metrik-Felder,
   Veraltung, fehlende Attribution, Zeit seit letztem Sync) in `data-quality/engine.ts`,
   persistiert einen `DataQualityReport` samt `DataQualityIssue`-Datensätzen und schreibt ein
   Audit-Log. Erreichbar per `POST /api/analytics/data-quality/scan` sowie dem Button
    „Qualitätsbericht erstellen" auf `/app/data-quality`. Fehlende Daten senken den Score
    (konservativ), statt als „gut" angenommen zu werden.
8. ✅ **Geplanter Auslöser (Cron)** hinzugefügt: `POST /api/analytics/jobs/run` führt beide Scans
    (Anomalie-Erkennung + Datenqualität) in einem Lauf aus. Geschützt wie der Publish-Worker
    (`WORKER_SECRET` bei gesetztem Secret, sonst Owner-Guard). Damit kann ein externer Scheduler
     (systemd-Cron / Vercel Cron) die automatisierte Qualitäts-Überwachung periodisch triggern.
     End-to-End verifiziert: Aufruf führt **Aggregation → Anomalie-Erkennung → Datenqualität** aus.
     Mit 26 eingespielten `AnalyticsEvent`s (ContentAsset `bc66b86f…`) erzeugte ein Lauf:
     - Aggregation: 2 `ContentPerformanceSnapshot`-Tages-Buckets (10/4/2/1 + 9.99 € Umsatz heute;
       6/3 gestern), idempotent via `deleteMany`+`create`.
     - Datenqualität: `DataQualityReport` (overall **0.656**) mit 2 korrekt erkannten Issues
       (`MISSING_METRICS` HIGH — nicht befüllte Umsatzfelder; `MISSING_ATTRIBUTION` MEDIUM — 1
       Conversion mit Provision, aber ohne `productId`).
     - Anomalie-Erkennung: 0 Treffer (nur 2 Snapshots, kein Baseline-Kontrast — korrekt).
 9. ✅ **Event-Aggregation als Job** hinzugefügt: `src/features/analytics/aggregation-job.ts`
    (`runAggregation`) rollt rohe `AnalyticsEvent`s deterministisch in tägliche Performance-Buckets
    (`ContentPerformanceSnapshot` / `ProductPerformanceSnapshot` / `PostingTimePerformance`),
    berechnet Engagement-/Conversion-/Klickraten und ist idempotent. Erreichbar per
    `POST /api/analytics/jobs/aggregate` sowie dem Button „Aus Events aggregieren" auf
    `/app/data-quality`. Raten werden strikt nicht-negativ begrenzt; Plattform ist typisiert als
    `SocialPlatform`. Nebenläufigkeit in `jobs/run` korrigiert (Aggregation zuerst, dann
     Anomalie/DQ via `Promise.all`). Ein `BigInt`-Cast auf Dezimal-Werte im DQ-Scan wurde behoben.
10. ✅ **Scheduler-Artefakte** angelegt (kein Verhalten des Cores verändert): `scripts/run-analytics-cron.sh`
    (ruft `POST /api/analytics/jobs/run` mit `WORKER_SECRET` + `APP_BASE_URL`) sowie
    `deploy/analytics-cron.service` + `deploy/analytics-cron.timer` (systemd, täglich 03:00 UTC,
    `Persistent=true`). Auth ist durchgehend erzwungen: geschützte Seiten/Query-APIs leiten ohne
    Session auf `/login` um (verifiziert), der Worker-Pfad (`jobs/run`) prüft das `WORKER_SECRET`
    (verifiziert via `Authorization: Bearer …`). Damit kann ein externer Scheduler die automatisierte
    Qualitätsüberwachung periodisch triggern — Vercel-Cron entsprechend via `vercel.json` möglich.

---

*Implementiert gemäß Spezifikation „Analytics, Content-Intelligence, Experimentation &
Automatisierte Optimierung" (33 Abschnitte). Domänenlogik ist framework-frei, versioniert und
deterministisch; alle Aussagen über Datenqualität/Signifikanz sind neutral und nachvollziehbar.*
