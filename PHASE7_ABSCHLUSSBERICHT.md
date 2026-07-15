# Phase 7 Abschlussbericht — Produkt-Intelligenz

_Projekt: UGC Affiliate OS · Phase 7 „Produkt-Recherche, Opportunity-Scoring, Affiliate-Discovery & Produktfreigabe"_

---

## 1. Zielsetzung & Umfang

Phase 7 überführt das bisherige manuelle „Produkt-Radar" in eine vollständige
**Produkt-Intelligenz-Pipeline**. Ziel ist die automatisierte, aber freigabe-
kontrollierte Recherche, Normalisierung, Deduplizierung, Compliance-Bewertung
und Chancen-Bewertung (Opportunity-Scoring) von Affiliate-Produkten aus mehreren
Provider-Quellen.

Umfang der Phase:

- **Produkt-Recherche / Discovery**: versionierte Discovery-Queries, Provider-
  Läufe (mock + CSV), Import-Batches mit Preview/Commit.
- **Kanonische Produkt-Identität**: Normalisierung, Deduplizierung/Matching und
  eine erweiterte `Product`-Entität als Single Source of Truth.
- **Anreicherung**: Compliance-Profile, Content-Fit-Profile, Profitabilitäts-
  Schätzungen und Datenqualitäts-Reports.
- **Opportunity-Scoring**: gewichtete, deterministische Chancen-Bewertung mit
  Score-Komponenten und Konfidenz.
- **Produktfreigabe**: manueller Approval-Workflow (`Approval`-Modell) für
  Produkte und Opportunities — **keine** Auto-Freigabe.
- **Automatisierung**: nächtliche Research-Pipeline via systemd-Timer.
- **UI/API/RBAC/Observability** für alle genannten Bausteine.

Nicht enthalten: aktive Live-Provider-Adapter, KI-Anreicherung und Auto-Freigabe
(alle bewusst hinter Feature-Flags deaktiviert — siehe §9 und §14).

---

## 2. Architekturüberblick

Die Implementierung folgt strikt der bestehenden Schichten-/Ports-Architektur:

```
UI (src/app/app/intelligence/**)  ─┐
API (src/app/api/products/**)      ─┤→ Application Services ─→ Domain (rein) ─→ Ports ─→ Infrastructure
                                    │   (src/features/products/    (src/features/         (src/lib/providers/
                                    │    application/*.ts)          products/domain/*.ts)  affiliate/*.ts, prisma)
```

Kernprinzipien:

- **Abhängigkeitsrichtung**: UI/API → Application → Domain → Ports →
  Infrastructure. Keine Rückwärtsabhängigkeiten.
- **Framework-freie Domäne**: `src/features/products/domain/*` importiert weder
  Next.js, React, Prisma noch Provider-SDKs. Alle Domänenfunktionen sind rein
  und deterministisch, ohne `any`.
- **Ports**: `ProductSourcePort` (in `domain/types.ts`) abstrahiert Affiliate-
  Quellen; die Infrastruktur (`src/lib/providers/affiliate/registry.ts`)
  resolved den Port und liefert derzeit stets den deterministischen Mock.
- **Single-Tenant / Workspace-Scoping**: alle Modelle und Reads sind über
  `workspaceId` (Default `00000000-0000-0000-0000-000000000001`,
  `DEFAULT_WORKSPACE_ID`) isoliert.

---

## 3. Datenmodell (Schema-Erweiterungen)

Migration: `prisma/migrations/20260714080000_phase7_product_intelligence`.

### Neue Enums

- `AffiliateOfferStatus` — ACTIVE / PAUSED / EXPIRED / UNAVAILABLE / INVALID.
- `Availability` — IN_STOCK / LIMITED / OUT_OF_STOCK / PREORDER / UNKNOWN.
- `CommissionType` — PERCENTAGE / FIXED / VARIABLE / UNKNOWN.
- `ProductSourceFailureCode` — 12 strukturierte Fehlercodes (u. a.
  AUTHENTICATION_FAILED, RATE_LIMITED, PRODUCT_NOT_FOUND, NETWORK_ERROR).
- `DiscoveryQueryStatus` — DRAFT / ACTIVE / PAUSED / ARCHIVED.
- `DiscoveryRunStatus` — QUEUED / RUNNING / PARTIALLY_COMPLETED / COMPLETED /
  FAILED / CANCELLED.
- `MatchMethod` — EXTERNAL_ID / GTIN / MANUFACTURER_PART_NUMBER /
  NORMALIZED_NAME / FUZZY / MANUAL.
- `MatchStatus` — PENDING / CONFIRMED / REJECTED.
- `ComplianceStatus` — PENDING / PASSED / FAILED / MANUAL_REVIEW.
- `OpportunityStatus` — NEW / UNDER_REVIEW / APPROVED / REJECTED / EXPIRED /
  CONVERTED_TO_CAMPAIGN.
- `ResearchJobType` — 11 Job-Typen (Discovery-Run, Provider-Import,
  Normalization, Deduplication, Offer-Refresh, Compliance, Content-Fit,
  Profitability, Opportunity-Scoring, Opportunity-Expiration, Data-Quality-Scan).
- `ResearchJobStatus` — QUEUED / RUNNING / COMPLETED / FAILED / CANCELLED.
- `ProductDataQualityIssueType` — 17 Ausprägungen (Missing-*, Invalid-*,
  Stale-Offer, Conflicting-Identity, Possible-Duplicate, Currency-Mismatch etc.).
- `ApprovalStatus` — DRAFT / PENDING / APPROVED / REJECTED.
- `ApprovalResourceType` — product / affiliate_offer / product_opportunity /
  product_campaign_candidate.

### Neue Modelle

- `ProductCategory` — Kategorie-Hierarchie mit Risiko- und Freigabe-Flags
  (`requiresManualApproval`, `contentGenerationAllowed`, `affiliatePromotionAllowed`).
- `AffiliateOffer` — Provider-spezifisches Angebot je Produkt (Preis, Provision,
  Verfügbarkeit, Rating), `@@unique([provider, externalProductId, externalOfferId])`.
- `AffiliateOfferSnapshot` — historische Preis-/Provisions-/Verfügbarkeits-Snapshots.
- `ProductDiscoveryQuery` — Recherche-Query mit Keyword-/Preis-/Provisions-Filtern.
- `ProductDiscoveryQueryVersion` — versionierte Query-Snapshots (JSON).
- `ProductDiscoveryRun` — Lauf mit Zählern, `correlationId` und `idempotencyKey`.
- `ProductDiscoveryProviderRun` — Sublauf je Provider inkl. `failureCode`.
- `ProductImportBatch` / `ProductImportRow` — CSV-Import mit Preview-Token und
  Roh-/Normalisierten-Daten je Zeile.
- `ProductMatchCandidate` — Match-Kandidat (Methode, Konfidenz, Evidenz, Status).
- `ProductComplianceProfile` — Compliance-Ergebnis mit Risiko-Flags, Reasons und
  `evaluationVersion`.
- `ProductContentFitProfile` — Content-Eignung (Scores + empfohlene HookTypes /
  ScriptStructures / PublishingFormats).
- `ProductProfitabilityEstimate` — Netto-Ertrags-Schätzung je Offer mit Bounds
  und `estimationVersion`.
- `ProductOpportunity` — Chance mit Gesamt-Score, 9 Komponenten-Scores,
  Konfidenz, `scoringVersion` und `expiresAt`.
- `ProductOpportunityScoreComponent` — Score-Komponente (Gewicht, Beitrag,
  Erklärung, Evidenz).
- `ProductDataQualityReport` / `ProductDataQualityIssue` — 6 Sub-Scores +
  Gesamt-Score und detaillierte Issues.
- `ProductResearchJob` — Job-Zeile mit `correlationId`, `idempotencyKey`,
  `attemptCount`/`maxAttempts`.
- `ProductSourceConfiguration` — Provider-Konfiguration (enabled, mode,
  credentialId, capabilities), `@@unique([workspaceId, provider])`.
- `Approval` — Phase-5/7 Freigabe-Workflow (`resourceType`, `resourceId`,
  `status`, `requestedBy`/`decidedBy`, `decisionReason`).

### Erweiterte Modelle

- `Product` — um kanonische Identität ergänzt (`canonicalName`, `slug`,
  `brandName`, `manufacturerName`, `categoryId`, `nicheId`, `languageCode`,
  `targetCountryCodes`, `lastVerifiedAt`, `riskLevel`); Legacy-„Radar"-Spalten
  bleiben rückwärtskompatibel erhalten. Neue Relationen zu Offers, Compliance-,
  Content-Fit-, Profitabilitäts-, Opportunity-, Match- und Data-Quality-Entitäten.
  `@@unique([workspaceId, slug])`.

---

## 4. Domänenlogik

Alle Module in `src/features/products/domain/` sind **rein, deterministisch,
framework-frei** und ohne `any`. Geld-/Rating-Werte nutzen `Decimal`
(`@/lib/shared/decimal`), fehlende Werte bleiben `null`.

- **Normalisierung** (`normalization.ts`): `normalizeProductName`,
  `normalizeBrand`, `normalizeDescription`, Unicode-/Whitespace-Normalisierung,
  `stripHtml`, `stripTrackingParams` (entfernt `RESTRICTED_URL_PARAMS` wie
  `ref`, `aff`, `tag`), URL-/Währungs-/Länder-/Sprach-Validierung sowie
  `normalizeOffer`.
- **Deduplizierung** (`deduplication.ts`): Priorität gemäß Spec §13 —
  `external_id` > `gtin` > `manufacturer_part_number` > `normalized_name` >
  `fuzzy` (`manual` wird nicht automatisch erkannt). Liefert `MatchResult` mit
  Methode, Konfidenz und Evidenz; `resolveMatch` wählt den besten Treffer.
- **Compliance** (`compliance.ts`, `COMPLIANCE_VERSION = "1.0.0"`):
  deterministische Regel-Engine über Kategorie-/Nische-/Markt-Freigaben plus
  Keyword-basierte Risikoerkennung (Gesundheits-, Finanz-, Trademark-,
  Alters-, Irreführungs-Risiken). Ergebnis: Status, Risk-Level, Flags, Reasons.
  Ausdrücklich **keine Rechtsberatung** (Hinweis im Modulkopf).
- **Opportunity-Scoring** (`opportunity-scoring.ts`): gewichtete Summe aus 9
  Komponenten-Scores (0..100) → Gesamt-Score (0..100). `OPPORTUNITY_WEIGHTS`
  (aus `domain/types.ts`): commission 0.15, demand 0.15, competition 0.10,
  contentFit 0.15, audienceFit 0.10, trend 0.10, profitability 0.15,
  dataQuality 0.05, compliance 0.05 (Summe = 1, per `assertWeightsSumToOne`
  geprüft). `SCORING_VERSION = "1.0.0"`. Bei `complianceCritical` wird der
  Gesamt-Score auf **0** gesetzt (Chance blockiert). Konfidenz wird bei
  schwacher Datenqualität (<50) und kleiner Stichprobe (<30) reduziert. Jede
  Erklärung endet mit dem Hinweis, dass Scores heuristische Schätzungen sind
  und kein Umsatz zugesichert wird.
- **Content-Fit** (`content-fit.ts`): heuristischer Analyzer **ohne LLM/AI**;
  Demonstrierbarkeit, Visual-Appeal, Problem-Solution-Fit etc. sowie empfohlene
  HookTypes/ScriptStructures/PublishingFormats. Bei nicht erlaubter
  Content-Generierung kollabieren Scores und Konfidenz auf 0.
- **Profitabilität** (`profitability.ts`, `PROFITABILITY_VERSION = "1.0.0"`):
  reine `Decimal`-Mathematik ohne Präzisionsverlust; berechnet Provision pro
  Conversion, Umsatz/Netto pro Post und Bounds. Ohne Datenbasis → alle Werte
  `null`, Konfidenz 0.
- **Datenqualität** (`data-quality.ts`): 6 Sub-Scores (Completeness, Freshness,
  Consistency, Identity, Commercial, Compliance) + gewichteter Gesamt-Score;
  `null` gilt als „fehlend" (keine Coercion zu 0/"").

---

## 5. Anwendungsschicht (Services)

- **`application/core.ts`** — orchestriert Persistenz + Domäne:
  `classifyOffers`, `runDiscoveryForQuery`, `recomputeMatchesForPendingOffers`,
  `confirmMatch`/`rejectMatch`, `evaluateComplianceForProduct`/`overrideCompliance`,
  `analyzeContentFitForProduct`, `estimateProfitabilityForOffer`,
  `scoreProductOpportunities`, `expireOpportunities`, `approveProduct`/
  `rejectProduct`/`archiveProduct` (`nextProductStatus`), `approveOpportunity`/
  `rejectOpportunity`/`convertOpportunityToCampaign`, `previewImport`/
  `commitImport`, `scanDataQualityForProduct`, `refreshOffers`.
- **`application/query-service.ts`** — CRUD für `ProductDiscoveryQuery` mit
  versionierten Snapshots (`listQueries`, `getQuery`, `createQuery`,
  `updateQuery`, `listRuns`, `getRun`), alle workspace-scoped und auditiert.
- **`application/steps.ts`** — abhängigkeitsfreie Step-Registry (`STEP_NAMES`,
  `STEP_JOB_TYPE`), von reinen Tests konsumierbar.
- **`application/research-job.ts`** — `runAll(actor, correlationId, workspaceId)`
  führt die 9 geordneten Schritte fault-isoliert aus (jeder Schritt als
  `ProductResearchJob`-Zeile, Fehler brechen die Pipeline nicht ab):
  1. `refreshOffers`, 2. `discovery` (je ACTIVE-Query, übersprungen wenn Flag
  aus), 3. `recomputeMatches`, 4. `compliance` (DISCOVERED/UNDER_REVIEW),
  5. `contentFit` (alle Produkte), 6. `profitability` (aktive/pausierte Offers),
  7. `opportunityScoring`, 8. `expireOpportunities`, 9. `dataQuality`.
  Produkte werden **nie automatisch freigegeben** (Auto-Approval-Flag ist per
  Default `false`).

---

## 6. API-Endpunkte

Alle Routen unter `src/app/api/products/**` sind über `requireApiPermission(...)`
(`@/lib/api/guard`) abgesichert und workspace-scoped.

**Katalog & Produktfreigabe**
- `GET /api/products/catalog` — `products.read`
- `GET/PATCH /api/products/[id]` — `products.read` / `products.edit`
- `POST /api/products/approve` — `products.approve`
- `POST /api/products/reject` — `products.reject`
- `POST /api/products/archive` — `products.archive`
- `GET /api/products/export` — Katalog-Export
- `GET/POST /api/products/categories` — `product_categories.read` / `.manage`

**Discovery**
- `GET/POST /api/products/discovery/queries` — `product_discovery.read` / `.create`
- `GET/PATCH /api/products/discovery/queries/[id]` — `product_discovery.read` / `.manage`
- `POST /api/products/discovery/queries/[id]/run` — `product_discovery.run`
- `GET /api/products/discovery/runs` · `GET /api/products/discovery/runs/[id]` — `product_discovery.read`

**Offers**
- `GET/POST /api/products/offers` — `product_offers.read` / `.manage`
- `GET/PATCH /api/products/offers/[id]` — `product_offers.read` / `.manage`
- `POST /api/products/offers/refresh` — `product_offers.refresh`

**Imports**
- `POST /api/products/imports/preview` — `product_imports.preview`
- `POST /api/products/imports/commit` — `product_imports.commit`

**Matches**
- `GET /api/products/matches` — `product_matches.read`
- `POST /api/products/matches/[id]/confirm` · `.../reject` — `product_matches.review`

**Compliance**
- `GET /api/products/compliance` — `product_compliance.read`
- `POST /api/products/compliance/evaluate` — `product_compliance.evaluate`
- `POST /api/products/compliance/override` — `product_compliance.override`

**Opportunities**
- `GET /api/products/opportunities` — `product_opportunities.read`
- `POST /api/products/opportunities/score` — `product_opportunities.score`
- `POST /api/products/opportunities/approve` — `product_opportunities.approve`
- `POST /api/products/opportunities/reject` — `product_opportunities.reject`
- `POST /api/products/opportunities/convert` — `product_opportunities.convert`

**Profitabilität & Content-Fit**
- `GET /api/products/profitability` — `product_profitability.read`
- `POST /api/products/profitability/estimate` — `product_profitability.estimate`
- `GET /api/products/content-fit` — `product_content_fit.read`

**Worker-Hook**
- `POST /api/products/jobs/run` — ruft `runAll` auf. Auth: `WORKER_SECRET` per
  `Authorization: Bearer …`; ist kein Secret gesetzt, greift der Fallback auf
  den eingeloggten Owner (`getCurrentUser`). Ohne beides → `401`.

---

## 7. Dashboards / UI

Sechs Seiten unter `src/app/app/intelligence/**`:

1. `discovery/page.tsx` — Produkt-Discovery (Queries + Läufe).
2. `catalog/page.tsx` — Produkt-Katalog (Filter/Tabelle).
3. `[id]/page.tsx` — Produkt-Detail (Offers, Compliance, Content-Fit,
   Profitabilität, Opportunities, Data-Quality).
4. `opportunities/page.tsx` — Opportunity-Board.
5. `matches/page.tsx` — Match-Review.
6. `import/page.tsx` — Import-Center (CSV Preview/Commit).

Client-Komponenten unter `src/components/intelligence/` (u. a. `catalog-table`,
`catalog-filters`, `run-query-button`, `score-opportunities-button`,
`opportunity-actions`).

Navigation: neuer Abschnitt **„Produkt-Intelligenz"** in `src/lib/app-nav.ts`
mit Einträgen Produkt-Discovery, Produkt-Katalog, Opportunity-Board,
Match-Review und Import-Center (Detailseite `[id]` wird kontextuell verlinkt).

---

## 8. Scheduler & Automatisierung

Nächtliche Research-Pipeline über systemd:

- `deploy/product-research-cron.timer` — `OnCalendar=*-*-* 04:00:00 UTC`,
  `Persistent=true`, `RandomizedDelaySec=300`.
- `deploy/product-research-cron.service` — `Type=oneshot`, ruft das Shell-Skript
  auf, lädt `.env` (u. a. `WORKER_SECRET`, `APP_BASE_URL`).
- `scripts/run-product-research-cron.sh` — `POST` gegen
  `${APP_BASE_URL}/api/products/jobs/run` mit `Authorization: Bearer ${WORKER_SECRET}`;
  fehlt das Secret, wird auf den Owner-Fallback hingewiesen. Fehler sind
  nicht-fatal (Logging via stderr).

---

## 9. Feature-Flags

Definiert in `src/lib/config/feature-flags.ts` (Env-gesteuert, sichere Defaults):

| Flag | Default |
|---|---|
| `productDiscoveryEnabled` | **ON** |
| `productDiscoveryMockProviderEnabled` | **ON** |
| `productDiscoveryCsvEnabled` | **ON** |
| `productDiscoveryAmazonEnabled` | OFF |
| `productDiscoveryEbayEnabled` | OFF |
| `productDiscoveryAwinEnabled` | OFF |
| `productDiscoveryImpactEnabled` | OFF |
| `productDiscoveryCjEnabled` | OFF |
| `productDiscoveryRakutenEnabled` | OFF |
| `productDiscoveryShareasaleEnabled` | OFF |
| `productDiscoveryAdcellEnabled` | OFF |
| `productDiscoveryDigistore24Enabled` | OFF |
| `productEnrichmentAiEnabled` | OFF |
| `productAutoApprovalEnabled` | OFF |
| `productAutoContentGenerationEnabled` | OFF |

Kurz: Discovery mit Mock + CSV aktiv, alle Live-Provider aus, KI-Anreicherung
aus, Auto-Freigabe und Auto-Content-Generierung aus.

---

## 10. RBAC & Berechtigungen

`src/lib/auth/rbac.ts` ergänzt den Phase-7-Berechtigungskatalog (u. a.
`products.read/create/edit/approve/reject/archive`,
`product_categories.read/manage`, `product_offers.read/manage/refresh`,
`product_discovery.read/create/run/manage`,
`product_imports.read/preview/commit`, `product_matches.read/review`,
`product_compliance.read/evaluate/override`,
`product_opportunities.read/score/approve/reject/convert`,
`product_profitability.read/estimate`, `product_content_fit.read`).

Neue Rolle **`affiliate_manager`** mit Schreib-/Betriebsrechten (Produkte
anlegen/bearbeiten, Kategorien/Offers verwalten, Discovery/Imports/Matches/
Compliance betreiben). `viewer` erhält alle `*.read`-Rechte; `analyst` kann
scoren/schätzen; `finance_viewer` sieht Profitabilität und Produkte read-only.

---

## 11. Observability & Metriken

`src/lib/observability/metrics.ts` definiert die `ugc_product_*`-Zähler, u. a.:
`ugc_product_discovery_runs_total`, `…_runs_failed_total`, `…_duration_ms`,
`ugc_product_offers_imported_total` / `…_updated_total` / `…_unavailable_total`,
`ugc_product_duplicates_detected_total`, `ugc_product_matches_confirmed_total` /
`…_rejected_total`, `ugc_product_compliance_failed_total`,
`ugc_product_manual_review_total`, `ugc_product_opportunities_created_total` /
`…_approved_total` / `…_rejected_total` / `…_expired_total`,
`ugc_product_opportunity_score`, `…_opportunity_confidence`,
`ugc_product_data_quality_score`, `ugc_product_provider_rate_limited_total`,
`ugc_product_provider_failed_total`, `ugc_product_research_queue_lag_seconds`.

Strukturierte Logs via `logStructured` mit `correlationId`; sensible Daten
(Secrets, Affiliate-URLs) werden nicht geloggt (Redaction).

---

## 12. Tests & Qualitätssicherung

Alle vier Gates **GRÜN**:

| Gate | Befehl | Ergebnis |
|---|---|---|
| Typecheck | `pnpm typecheck` | ✅ 0 Fehler |
| Lint | `pnpm lint` | ✅ 0 Fehler (nur vorbestehende Warnungen) |
| Tests | `pnpm test` | ✅ 129/129 grün (17 Test-Dateien) |
| Build | `pnpm build` | ✅ Exit 0 (Next.js 16, alle Routen kompiliert) |

Phase-7-Unit-Tests (rein/deterministisch):

- Domäne (`src/features/products/domain/*.test.ts`): `normalization` (16),
  `deduplication` (13), `compliance` (9), `data-quality` (9),
  `opportunity-scoring` (7), `profitability` (4), `content-fit` (3).
- Anwendung (`src/features/products/application/*.test.ts`): `core` (3),
  `import-service` (3), `research-job` (2).
- Infrastruktur: `src/lib/providers/affiliate/csv-import.test.ts` (6).

---

## 13. Datenschutz, Audit & Konformität

- **Audit**: alle mutierenden Services schreiben `writeAuditLog(...)` (Query-CRUD,
  Discovery-Läufe, Approvals, `product.research.runAll`).
- **Keine Secrets in Logs**: `WORKER_SECRET`, Provider-Credentials und
  Affiliate-URLs werden nicht protokolliert; `stripTrackingParams` entfernt
  Tracking-/Affiliate-Parameter aus URLs.
- **Keine Rechtsberatung**: das Compliance-Modul ist ausdrücklich ein
  automatisiertes heuristisches Hilfsmittel, keine Rechtsberatung.
- **Keine Umsatzzusagen**: Opportunity- und Profitabilitäts-Erklärungen weisen
  auf den heuristischen Schätzcharakter hin.
- **Workspace-Isolation**: alle Reads/Writes sind über `workspaceId` gescoped.

---

## 14. Bekannte Einschränkungen / Nicht in Phase 7 enthalten

- **Live-Provider-Adapter** sind Skelette; die Registry liefert stets den
  deterministischen Mock-Provider — keine echten Affiliate-Netzwerk-Credentials
  verdrahtet.
- **KI-Anreicherung** (`productEnrichmentAiEnabled`) ist nicht aktiv; Content-Fit
  ist rein heuristisch (kein LLM).
- **Auto-Freigabe** (`productAutoApprovalEnabled`) und Auto-Content-Generierung
  sind deaktiviert; Freigaben erfolgen manuell.
- **Dashboards** sind funktional, aber vereinfacht (keine Charts, keine
  Client-seitige Sortierung).
- **Integrationstests** sind rein/Unit-basiert; eine Live-DB-Integrations-Suite
  existiert noch nicht.

---

## 15. Nächste Schritte / Empfehlungen

1. Live-Provider-Adapter (Amazon, eBay, Awin, Impact, CJ, Rakuten, ShareASale,
   AdCell, Digistore24) hinter den bestehenden Flags implementieren und mit
   echten Credentials über `ProductSourceConfiguration` verdrahten.
2. DB-gestützte Integrationstests für die `runAll`-Pipeline und die API-Routen
   ergänzen.
3. Dashboards um Charts, Sortierung/Pagination und Score-Visualisierung anreichern.
4. Auto-Freigabe schrittweise aktivieren, sobald die manuelle Review-Konfidenz
   ausreichend belegt ist (Flag-gesteuert, mit Schwellenwerten).
5. KI-Anreicherung für Content-Fit/Compliance als optionalen, flag-gesteuerten
   Layer evaluieren.

---

## 16. Gate-Befehle

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```
