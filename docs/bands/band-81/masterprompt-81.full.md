# CarryOS Universe – Band 81
# Masterprompt: Business Intelligence (VOLLSTÄNDIG)

> Band: 81 | Masterprompt: 81.0 | Status: PLANNED | Gruppe: Analytics
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Erweitert `src/lib/analytics`. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Bestehende Systeme werden erweitert, nicht dupliziert. Keine zweite Runtime/Engine/Queue/Finance.

- BI-Semantic-Layer als Erweiterung von `src/lib/analytics/metrics.ts`: zentrale `BIDimension`-, `BIFact`- und `BICube`-Definitionen, die auf `METRIC_DEFINITIONS` referenzieren (Single Source of Truth, formelversioniert v1.x).
- OLAP-fähige Cube-Aggregation in `src/lib/analytics/olap.ts`: rollup/slice/dice über bestehende Event-Metriken, tenantId als obligatorisches Partition-Feld.
- BI-Query-Service als thin Service-Schicht über bestehende Repository-Pattern; keine eigene Query-Engine, Nutzung der Core-DB-Abstraktion.
- BI-Caching via bestehendem Cache-Provider; materialisierte Cubes pro Tenant mit Invalidierung über Event-Subscriptions.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `BiCubeDefinition`: id, tenantId, name, dimensions[], measures[], refreshPolicy, versionierte Formel-Referenzen auf `METRIC_*`.
- `BiSavedQuery`: tenantId, ownerId, cubeId, filterJson (Zod-validiert), pivotConfig, createdAt.
- `BiDimensionMembership`: mappt Roh-Event-Felder (channel, campaign, contentId) auf BI-Dimensionen; tenantId-isolated.
- Bestehende `ContentMetricInput/Output` bleiben Kanon; BI liest aggregierte Fact-Tabellen, schreibt keine eigenen Rohdaten.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `GET /api/v1/bi/cubes` – Liste verfügbarer Cubes inkl. Dimensionen/Measures für den Tenant.
- `POST /api/v1/bi/query` – Zod-Schema `BiQueryRequestSchema` (cubeId, filters, rows, cols, measures); Antwort als Envelope mit paginierten Cell-Sets.
- `POST /api/v1/bi/queries` – Speichern/Laden von `BiSavedQuery` (Persistenz-Idempotenz via ExecutionKey).
- `GET /api/v1/bi/cubes/:id/refresh` – Trigger Materialisierung; nur mit `requireApiPermission("bi:refresh")`.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `bi.cube.materialized.v1` – nach erfolgreicher Cube-Aktualisierung; payload: cubeId, tenantId, rowCount, durationMs.
- `bi.query.executed.v1` – Audit-Event für jede ad-hoc Query (tenantId, cubeId, userId, cellCount, cached:boolean).
- `bi.query.saved.v1` / `bi.query.deleted.v1` – Lifecycle von `BiSavedQuery`.
- Cube-Invalidierung abonniert `analytics.metric.updated.v1` aus bestehendem Event-Bus.

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- BI-Query-Flow: withApiContext → Zod-Validate → requireApiPermission("bi:query") → Cube-Cache-Lookup → (Cache-Miss) Olap-Rollup → Repository-Read → Envelope.
- Cube-Refresh-Flow: Scheduler-Event → tenantScoped Refresh → Fact-Aggregation → Materialize → `bi.cube.materialized.v1` → Cache-Invalidate.
- Export-Flow: Query-Result → Format-Transform (CSV/XLSX) → Stream-Response; idempotent via Query-Hash als ExecutionKey.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `bi-analyst` Agent: formuliert natürlichsprachliche Fragen in `BiQueryRequest` (NL→Cube-Mapping), registriert in Band 11 Runtime.
- `bi-governor` Agent: überwacht Cube-Versionierung und Formel-Drift gegen `METRIC_FORMULA_VERSION`.
- Keine eigene Agent-Runtime; Nutzung der Band 11 OS-Runtime mit tenantScoped Context.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- `BiCubePicker` Komponente: Auswahl Cube + Dimensionen; ruft nur `/api/v1/bi/*` auf.
- `BiPivotGrid`: rendert Cell-Sets, reine Präsentation; alle Aggregationen server-seitig.
- `BiQueryBuilder`: visueller Filter-Builder, serialisiert zu `BiQueryRequestSchema`.
- Keine Fachlogik/Formeln im Client; Metriken kommen versioniert aus `metrics.ts`.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: `olap.test.ts` – Rollup/Slicing mit `safeRatio`-Semantik (null statt 0 bei Division-by-zero).
- Unit: `biQueryService.test.ts` – Zod-Validierung, Cache-Hit/Miss, ExecutionKey-Idempotenz.
- Integration: Query-endpoint gegen Test-DB mit zwei Tenants; Assert Tenant A sieht nicht Tenant B.
- Security-Test: `requireApiPermission` blockiert `bi:refresh` ohne Permission.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Jeder Cube-Query zwingend `tenantId` im DB-Filter; Repository-Wrapper verweigert Queries ohne tenantScope.
- `requireApiPermission("bi:query" | "bi:refresh" | "bi:export")` pro Endpunkt.
- Audit-Log aller Ad-hoc-Queries via `bi.query.executed.v1` (ohne Rohdaten-Payload, nur Metadaten).
- Keine BI-Secret/DB-Credentials im Code; Nutzung bestehender Core-Secrets-Infra.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Composite-Index `(tenantId, cubeId, dimensionHash)` auf materialisierten Fact-Tabellen.
- Cube-Materialisierung asynchron via Queue; p95 Query-Antwort < 800 ms (Cache-Hit), < 3 s (Cache-Miss).
- Cache-TTL pro Cube konfigurierbar; Invalidierung ereignisgetrieben statt Polling.
- Rollup-Strategie: Pre-Aggregation auf Tagesgranularität, Drill-Down lazy nur bei Bedarf.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
