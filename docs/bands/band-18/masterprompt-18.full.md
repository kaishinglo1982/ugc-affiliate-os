# CarryOS Universe – Band 18
# Masterprompt: UGC Affiliate Enterprise (VOLLSTÄNDIG)

> Band: 18 | Masterprompt: 18.0 | Status: PLANNED | Gruppe: Core Intelligence
> Abhängigkeit: Band 10 (API Governance), Band 11 (Agentic OS), Band 12 (Content Factory), Band 13 (Growth), Band 16 (Industry Solution Factory)

> Hinweis: Branchenedition. Plant auf Basis der Factory (Band 16); KEIN Core-Fork. Verweist auf bestehende Module in `src/lib/content-intelligence/`, `src/lib/recommendation/`, `src/lib/observability/`, `src/server/services/agents.ts`.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieser Branchenedition. UGC Affiliate Enterprise ist die Referenz-Edition des Repository: sie kombiniert Content Factory (12), Growth (13) und Observability (15) zu einer Affiliate-Publishing-Edition. Keine eigene Runtime/Engine/Queue/Finance.

- Edition als `IndustryPack` "ugc-affiliate": aktiviert content-intelligence, recommendation, observability — kein Fork der Ports.
- Affiliate-spezifische Objekte (ContentAsset, Variant, Attribution) sind Tenant-Daten, keine neue Engine.
- Content-Generierung bleibt DRAFT-only (Prinzip aus Band 12); Freigabe menschlich.
- Agent-Orchestrierung über `src/server/services/agents.ts`; keine zweite Agent-Schleife.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `TenantEdition` (industryPackId="ugc-affiliate") aus Band 16 bindet den Tenant.
- `ContentAsset`, `ContentVariant`, `Recommendation`, `AttributionEvent` (aus Band 12/13) als tenant-isolierte Fachmodelle.
- Affiliate-Links als `AttributionEvent` mit `correlationId`; rohe Tracking-URLs niemals persistiert im Klartext.
- Alle Reads über Repository mit `tenantId`-Filter; Affiliate-Dimension nur tenant-scoped.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `POST /api/v1/ugc/content/analyze` – delegiert an Band-12 `analyzeContent` (DRAFT-Prinzip).
- `POST /api/v1/ugc/recommendations/generate` – delegiert an Band-13 `rules.ts`.
- `POST /api/v1/ugc/attribution/track` – erfasst `AttributionEvent`, Zod-validiert, URL-redacted.
- `GET /api/v1/factory/edition/:tenantId` – aktive UGC-Affiliate-Konfiguration (Band 16).

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `ugc.content.analyzed.v1` / `ugc.content.variant.proposed.v1` – aus Band 12 (DRAFT-only).
- `ugc.recommendation.generated.v1` / `ugc.recommendation.accepted.v1` – aus Band 13.
- `ugc.attribution.recorded.v1` – Affiliate-Conversion, tenant-isoliert, URL-redacted.
- `ugc.edition.provisioned.v1` – aus Band 16 bei Aktivierung der Edition.

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Content-Flow: `withApiContext` → Zod → `requireApiPermission("ugc:content")` → Band-12 Service → DRAFT-Persistenz.
- Recommend-Flow: Band-13 `rules.ts`-Evaluierung → Persistenz → `ugc.recommendation.generated.v1`.
- Attribution-Flow: Track → Redaction (`redact` aus Observability) → Persistenz idempotent via ExecutionKey.
- Keine Fachlogik in Route Handlern; UGC-Services wrappen Band 12/13, erben deren Logik.

## Kapitel 6 – Agenten

Agenten/Rollen dieser Edition, registriert in Band 11 Runtime.

- `ugc-content-agent` Agent: nutzt Band-12 `content-analyst`/`variant-generator` im Affiliate-Kontext.
- `ugc-growth-agent` Agent: nutzt Band-13 `growth-optimizer` für Empfehlungen/Loops.
- `ugc-attribution-agent` Agent (lesend): korreliert `AttributionEvent` mit `correlationId`.
- Tools in `agentToolDefinition`; Policies auf UGC-Scope begrenzt (kein Core-Schreibzugriff).

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- UGC-Content-Studio: erbt Band-12 Analyse/Variant-UI, erweitert um Affiliate-Disclosure-Badge.
- Recommendation-Board: erbt Band-13 Board, zeigt Acceptance-Rate pro Kanal.
- Attribution-Funnel: `AttributionEvent`-View (tenant-isoliert), Tracking-URLs maskiert.
- Edition-Health: Observability-Metriken (contentAnalysisTotal, recommendationAcceptedTotal) im UGC-Kontext.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: Band-12/13 Ports liefern deterministische Ergebnisse im UGC-Kontext.
- Integration: Analyze→Recommend→Attribution-Flow tenant-isoliert end-to-end.
- Security: Cross-Tenant-Zugriff auf fremde `ContentAsset`/`AttributionEvent` → 403.
- Redaction-Test: Affiliate-Tracking-URLs in Attributonsdaten via `redact` maskiert.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- `requireApiPermission("ugc:content|ugc:recommend|ugc:attribution")` auf Endpunkten.
- Affiliate-Keys/Tracking-URLs niemals im Klartext; `redact`/`redactText` Pflicht in Logs.
- `correlationId`/`workspaceId` Pflicht in allen `logStructured`-Einträgen.
- Kein Auto-Publish: DRAFT-only-Regel aus Band 12 bleibt unangetastet.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `ContentAsset(tenantId, createdAt)`, `Recommendation(tenantId, status)`, `AttributionEvent(tenantId, correlationId)`.
- Analyse/Generierung asynchron; `contentAnalysisDurationMs`/`optimizationQueueLagSeconds` als p95-Ziele.
- Edition-Konfig gecacht pro `tenantId` (Band 16 Pattern); Attribution-Cache kurzlebig tenant-scoped.
- Metriken aus Observability, kein separater UGC-Telemetrie-Store.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: KEINE Core-Forks/Second Engines.
7. DRAFT-only + Redaction-Regel verifiziert.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
