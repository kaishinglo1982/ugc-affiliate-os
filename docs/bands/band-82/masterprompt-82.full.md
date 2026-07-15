# CarryOS Universe – Band 82
# Masterprompt: KPI Center (VOLLSTÄNDIG)

> Band: 82 | Masterprompt: 82.0 | Status: PLANNED | Gruppe: Analytics
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Erweitert `src/lib/analytics`. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Bestehende Systeme werden erweitert, nicht dupliziert. Keine zweite Runtime/Engine/Queue/Finance.

- KPI-Registry als Erweiterung von `metrics.ts`: `KpiDefinition` mit Zielwert, Schwellen (green/amber/red), Trend-Richtung und Referenz auf `METRIC_*`-Ids.
- KPI-Scorecard-Engine in `src/lib/analytics/kpi.ts`: berechnet Ist vs. Ziel, Status-Flags und Delta-Zeitreihe; nutzt `safeRatio` für Quotienten.
- KPI-Alerting-Service: abonniert Metrik-Events, evaluiert Schwellen, emittiert Alerts; kein eigenes Scheduler-System.
- Zielwerte tenant- und workspace-isoliert; Vererbung von Tenant-Default-KPIs möglich.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `KpiDefinition`: tenantId, workspaceId?, metricId (FK zu METRIC_DEFINITIONS), targetValue, greenThreshold, redThreshold, direction, cadence.
- `KpiSnapshot`: tenantId, kpiId, periodStart, periodEnd, actualValue (Decimal), status ("green"|"amber"|"red"), computedAt.
- `KpiTargetOverride`: erlaubt workspace-spezifische Zielwerte über Tenant-Default hinweg; tenantId-isolated.
- Scorecards referenzieren ausschließlich existierende Metriken; keine eigenen Rohdaten geschrieben.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `GET /api/v1/kpi/definitions` – Liste der KPI-Definitionen des Tenants inkl. aktuellem Status.
- `POST /api/v1/kpi/definitions` – Zod `KpiDefinitionSchema` (metricId muss in `METRIC_DEFINITIONS` existieren), idempotent via ExecutionKey.
- `GET /api/v1/kpi/scorecard?period=...` – aggregierte Snapshots als Envelope.
- `POST /api/v1/kpi/:id/target` – Setzen/Überschreiben von Zielwerten mit `requireApiPermission("kpi:configure")`.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `kpi.snapshot.computed.v1` – nach jeder Scorecard-Berechnung; payload: tenantId, kpiId, status, actualValue.
- `kpi.threshold.breached.v1` – Alert bei Statuswechsel nach red/amber; payload ohne Rohdaten.
- `kpi.definition.created.v1` / `kpi.definition.updated.v1` / `kpi.definition.deleted.v1` – Lifecycle.
- Scorecard-Neuberechnung abonniert `analytics.metric.updated.v1`.

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- KPI-Definition-Flow: withApiContext → Zod-Validate (metricId-Existenz) → requireApiPermission("kpi:configure") → Persist → Event → Envelope.
- Snapshot-Flow: Trigger (Scheduler/Cadence) → tenantScoped Metrik-Lesen → Scorecard-Engine → `KpiSnapshot` Upsert → `kpi.snapshot.computed.v1` → Alert-Eval.
- Target-Override-Flow: Validate → Upsert (idempotent) → invalidiert abhängige Snapshots.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `kpi-guardian` Agent: erkennt anhaltende red-Status und schlägt Gegenmaßnahmen vor; läuft in Band 11 Runtime.
- `kpi-coach` Agent: erklärt Delta-Zeitreihen und Benchmark-Abweichungen natürlichsprachig.
- Keine eigene Agent-Runtime; vollständig tenantScoped über Band 11 Context.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- `KpiCard` Komponente: zeigt Ist/Ziel, Status-Farbe, Trendspark; reine Präsentation der Snapshots.
- `KpiScorecard` Seite: Grid aller KPIs mit Filter nach workspace/period; ruft `/api/v1/kpi/*` auf.
- `KpiTargetForm`: editiert Zielwerte, serialisiert zu `KpiDefinitionSchema`.
- Keine Schwellen-Logik im Client; Status kommt serverseitig aus Scorecard-Engine.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: `kpi.test.ts` – Status-Berechnung (green/amber/red), `safeRatio`-Konformität, Decimal-Präzision.
- Unit: `kpiDefinitionSchema.test.ts` – Ablehnung unbekannter metricId, ungültiger Schwellen.
- Integration: Scorecard-Endpoint mit zwei Tenants; Assert strikte Trennung der Snapshots.
- Security-Test: `kpi:configure` blockiert ohne Permission.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- `KpiDefinition`/`KpiSnapshot` zwingend tenantId-gefiltert; Repository verweigert Queries ohne tenantScope.
- `requireApiPermission("kpi:read" | "kpi:configure")` pro Endpunkt.
- Alert-Events enthalten nur Metadaten (kpiId, status), keine personenbezogenen Rohdaten.
- Secrets/DB-Credentials ausschließlich über Core-Infra, nie im Code.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Composite-Index `(tenantId, kpiId, periodStart)` auf `KpiSnapshot`.
- Snapshot-Berechnung batchweise asynchron via Queue; p95 Scorecard-Lesen < 500 ms über Cache.
- KPI-Definitionen pro Tenant gecached; Invalidierung bei Definition-Update.
- Dezimal-Mathematik (`Decimal`) verhindert Float-Drift bei Ziel-Vergleich.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
