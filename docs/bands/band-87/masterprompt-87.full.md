# CarryOS Universe – Band 87
# Masterprompt: Benchmarking (VOLLSTÄNDIG)

> Band: 87 | Masterprompt: 87.0 | Status: PLANNED | Gruppe: Analytics
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Erweitert `src/lib/analytics`. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Bestehende Systeme werden erweitert, nicht dupliziert. Keine zweite Runtime/Engine/Queue/Finance.

- Benchmark-Engine in `src/lib/analytics/benchmarking.ts`: vergleicht Tenant-KPIs (Band 82) gegen Peer-Kohorten (Branche/Segment) aus anonymisierten Aggregaten; keine Rohdaten anderer Tenants sichtbar.
- Peer-Cohort-Builder: bildet anonymisierte Vergleichsgruppen über bestehende Metrik-Snapshots; strikte Aggregation, keine Identitäten.
- Benchmark-Service als thin Layer; nutzt voraggregierte Cubes (Band 81) für Cohort-Statistik.
- Differenz- und Percentile-Berechnung serverseitig; `safeRatio` für relative Metriken.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `BenchmarkCohort`: tenantId (des konfigurierenden Tenants), name, segmentFilterJson, metricIds[], anonymizedAt.
- `BenchmarkSnapshot`: tenantId, cohortId, metricId, tenantValue (Decimal), cohortMedian, cohortP90, percentileRank.
- `CohortAggregate`: anonymisiert, tenantId=NULL-Sentinel (System-Pool), segmentKey, metricId, median, p10, p90, sampleSize.
- Cohort-Aggregate speichern keine tenantIds; nur statistische Verteilung.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `GET /api/v1/benchmarks/cohorts` – Liste konfigurierter Cohorts des Tenants.
- `POST /api/v1/benchmarks/cohorts` – Zod `BenchmarkCohortSchema` (metricIds validiert); idempotent via ExecutionKey.
- `POST /api/v1/benchmarks/compare` – `BenchmarkRequestSchema` (cohortId, metricIds); Antwort mit tenantValue + Percentile als Envelope.
- `GET /api/v1/benchmarks/cohorts/:id/refresh` – Neuaggregierung; `requireApiPermission("benchmark:configure")`.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `benchmark.cohort.created.v1` / `benchmark.cohort.updated.v1` – Lifecycle.
- `benchmark.computed.v1` – nach Vergleich; payload: tenantId, cohortId, metricIds, percentileRanks (keine Rohdaten).
- `benchmark.cohort.aggregated.v1` – nach Cohort-Neuberechnung (System-Pool).
- Cohort-Refresh abonniert `kpi.snapshot.computed.v1` als Aggregat-Trigger.

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Cohort-Flow: withApiContext → Zod-Validate → requireApiPermission("benchmark:configure") → Persist → Event → Envelope.
- Compare-Flow: Validate → tenantScoped KPI-Lesen → Cohort-Aggregate-Lesen → Percentile → `BenchmarkSnapshot` Upsert → `benchmark.computed.v1`.
- Aggregate-Flow: anonymisierte Snapshots → Verteilung → `CohortAggregate` Upsert; idempotent via segmentKey+metricId.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `benchmark-analyst` Agent: erklärt Percentile-Abweichungen und Handlungsoptionen; in Band 11 Runtime, tenantScoped.
- `benchmark-curator` Agent: schlägt passende Cohort-Segmente aus Metrik-Profil vor.
- Keine eigene Agent-Runtime; keine Sichtbarkeit fremder Tenant-Rohdaten.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- `BenchmarkCard`: zeigt tenantValue vs. Median/P90 + Rank; reine Präsentation.
- `CohortConfigurator`: wählt Segment/Metriken; serialisiert zu `BenchmarkCohortSchema`.
- `PercentileBadge`: rendert percentileRank aus `BenchmarkSnapshot`.
- Keine Cohort-Statistik im Client; Werte serverseitig aus Aggregaten.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: `benchmarking.test.ts` – Percentile-Rank, Median/P90 über Verteilung, `safeRatio`-konform.
- Unit: `benchmarkCohortSchema.test.ts` – Ablehnung ungültiger metricIds, leerer Segment-Filter.
- Integration: compare-Endpoint mit zwei Tenants; Assert kein fremder Rohwert sichtbar.
- Security-Test: `benchmark:configure` blockiert ohne Permission; Cross-Tenant-Cohort-Zugriff verweigert.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Benchmark-Daten zwingend tenantId-gefiltert; Cohort-Aggregate enthalten KEINE tenantIds.
- `requireApiPermission("benchmark:read" | "benchmark:configure")`.
- Anonymisierung: sampleSize<Minimierungsschwelle → Aggregate unterdrückt (Privacy-by-Design).
- Keine Rohdaten anderer Tenants im Payload; nur statistische Verteilung.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Composite-Index `(tenantId, cohortId, metricId)` auf `BenchmarkSnapshot`.
- Cohort-Aggregate gecached (segmentKey+metricId); p95 compare < 600 ms.
- Aggregierung asynchron via Queue; Minimierungsschwelle vor Speicherung geprüft.
- Nutzung voraggregierter KPI-Snapshots statt Roh-Event-Scans.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
