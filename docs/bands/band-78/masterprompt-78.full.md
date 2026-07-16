# CarryOS Universe – Band 78
# Masterprompt: Observability (VOLLSTÄNDIG)

> Band: 78 | Masterprompt: 78.0 | Status: PLANNED | Gruppe: Enterprise
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

## Kapitel 1 – Architektur

Beschreibt die Observability-Schichten. Nutzt zwingend `src/lib/observability`.

- Thema: Tracing, Logs-Korrelation und Distributed Context über alle Bänder, tenant-aware.
- Erweitert `src/lib/observability/metrics.ts` um Tracing/Span-API (`trace.ts`, `context.ts`).
- Drei Säulen: Metrics (bestehend), Logs (Audit 76), Traces (neu) – ein Observability-Backend.
- Integration mit Monitoring (77): Traces liefern Root-Cause für Incidents.
- Keine zweite Observability-Infrastruktur: ausschließlich `src/lib/observability` erweitern.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `TraceSpan`: tenantId, traceId, spanId, parentId, service, op, startNs, durNs, status.
- `TraceIndex`: tenantId, traceId, rootOp, totalDurMs, errorFlag, createdAt.
- `LogTraceLink`: tenantId, traceId, auditEventId (korreliert Audit 76).
- `ObservabilityConfig`: tenantId, samplingRate, retentionDays.
- Tabellen tenant-isoliert via `tenant.ts`; Spans partitioniert nach tenantId+traceId.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `GET /api/v1/observability/traces` – Traces filtern (Zod `TraceQuery`: service, error, from).
- `GET /api/v1/observability/traces/:id` – Span-Baum eines Traces.
- `GET /api/v1/observability/spans/latency` – p50/p95/p99 je Service.
- `POST /api/v1/observability/config` – Sampling/Retention setzen (Permission `obs.admin`).
- Endpunkte nutzen `withApiContext`; Span-Erfassung über `src/lib/observability`.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `observability.trace.ingested.v1` – Trace persistiert/indiziert.
- `observability.span.error.v1` – fehlerhafter Span detektiert.
- `observability.config.changed.v1` – Sampling/Retention angepasst.
- `observability.anomaly.detected.v1` – Latenz/Fehlerrate-Anomalie.
- Consumer: Monitoring (77), Audit (76).

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Span-Capture: Request → Context-Propagation → `trace.ts` Span → Async Flush.
- Trace-Query: Index → Spans laden → Baum-Aufbau → Envelope.
- Anomaly: Metrik-Trend → Detector → `observability.anomaly.detected.v1` → Alert (77).
- Correlation: Audit-Event → `LogTraceLink` → Trace-Drilldown.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `observability-analyst` Agent: findet Flaschenhälse aus Traces, korreliert mit Incidents.
- `anomaly-hunter` Agent: entdeckt Abweichungen in Latenz/Fehlerraten pro Tenant.
- Registrierung in Band-11-Runtime; kein eigener Loop.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- `src/app/app/observability` UI: Trace-Explorer, Service-Latenz, Error-Breakdown.
- Span-Waterfall-Komponente; Correlation-Panel mit Audit-Links.
- Keine Trace-Aggregationslogik im Client; serverseitig über `src/lib/observability`.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: `trace.ts` Context-Propagation, Sampling-Entscheidung, Span-Baum-Aufbau.
- Integration: Request → Span erfasst → Trace-Query liefert Baum.
- Security-Test: Cross-Tenant Trace nicht sichtbar; tenantId in jedem Span erzwungen.
- Negative: Sampling=0 verwirft Spans, ohne Tenant-Context wird abgelehnt.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- AuthN über Session-System; AuthZ via `rbac.ts` mit `obs.*`-Permissions.
- Tenant-Isolation via `tenant.ts`; Spans/Indices strikt tenant-partitioniert.
- Keine Secrets in Span-Attributes; sensible Felder maskiert.
- Trace-Daten verschlüsselt at rest; Retention nach `ObservabilityConfig`.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `TraceSpan(tenantId, traceId)`, `TraceIndex(tenantId, createdAt, errorFlag)`.
- Span-Flush asynchron (Batch); p95 Trace-Query < 100ms über Index.
- Sampling reduziert Ingest-Last; Hot-Path overhead < 1ms durch `metrics.ts`.
- Aggregationen (p95) über Read-Model/Time-Series, nicht Live-Joins.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: nutzt `src/lib/observability`, keine zweite Engine.
7. Security-Test: Cross-Tenant-Observability-Block bestanden.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
