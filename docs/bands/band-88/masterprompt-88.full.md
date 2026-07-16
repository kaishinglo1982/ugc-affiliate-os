# CarryOS Universe – Band 88
# Masterprompt: Data Warehouse (VOLLSTÄNDIG)

> Band: 88 | Masterprompt: 88.0 | Status: PLANNED | Gruppe: Analytics
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Erweitert `src/lib/analytics`. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Bestehende Systeme werden erweitert, nicht dupliziert. Keine zweite Runtime/Engine/Queue/Finance.

- DWH-Schema-Layer in `src/lib/analytics/warehouse.ts`: logische Star-Schema-Definition (Fact/Dimension Tables) über vorhandene Event- und Metrik-Daten; keine zweite DB-Engine, Nutzung der Core-DB-Abstraktion mit tenantId-Partitionierung.
- ETL-Orchestrator: inkrementelle Ladeprozesse über bestehenden Event-Bus/Outbox; idempotente Batch-Ladeschlüssel.
- DWH-Query-Federation: leitet analytische Abfragen (Band 81 BI) an materialisierte Fact-Tabellen; keine eigene Query-Sprache.
- Tenant-Isolation via partionierte Schemata; Physikalische Trennung optional, logisch zwingend.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `DwhFactTable`: tenantId, name, grainJson, sourceEvent, retentionDays, lastLoadedAt.
- `DwhDimension`: tenantId, name, sourceEntity, keyColumns[], scdType.
- `DwhLoadBatch`: tenantId, factTableId, watermarkHigh, rowsLoaded, durationMs, status.
- Fact/Dimension referenzieren existierende Events/Metriken; keine Rohdaten-Duplikate außerhalb des Schemas.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `GET /api/v1/dwh/facts` – Liste Fact-Tabellen des Tenants inkl. Grain/Source.
- `POST /api/v1/dwh/facts` – Zod `DwhFactTableSchema` (sourceEvent validiert); idempotent via ExecutionKey.
- `POST /api/v1/dwh/load` – Trigger inkrementelle Ladung; `requireApiPermission("dwh:load")`.
- `GET /api/v1/dwh/batches?factId=...` – Lade-Historie als Envelope.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `dwh.fact.registered.v1` / `dwh.fact.deregistered.v1` – Lifecycle.
- `dwh.batch.loaded.v1` – nach ETL-Lauf; payload: tenantId, factTableId, watermarkHigh, rowsLoaded.
- `dwh.load.failed.v1` – bei Fehler; payload ohne Rohdaten, nur Metadaten + Fehlerklasse.
- ETL abonniert `analytics.metric.updated.v1` / Outbox-Events als Lade-Trigger.

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Fact-Registration-Flow: withApiContext → Zod-Validate (sourceEvent existiert) → requireApiPermission("dwh:configure") → Persist → Event → Envelope.
- Load-Flow: Validate → Watermark-Lesen → inkrementelle Extraktion → Transform → Fact-Upsert → `DwhLoadBatch` → `dwh.batch.loaded.v1`.
- Retry-Flow: bei `dwh.load.failed.v1` → Watermark unverändert → erneuter Versuch; idempotent via Batch-ExecutionKey.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `dwh-architect` Agent: schlägt Fact/Dimension-Grain aus Event-Profil vor; in Band 11 Runtime, tenantScoped.
- `dwh-steward` Agent: überwacht Datenqualität/Lade-Latenz und meldet Anomalien.
- Keine eigene Agent-Runtime; vollständig tenantScoped.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- `DwhFactExplorer`: listet Fact/Dimension-Tabellen; ruft `/api/v1/dwh/*` auf.
- `LoadHistoryTable`: zeigt `DwhLoadBatch`es; reine Präsentation.
- `FactConfigurator`: konfiguriert Grain/Source; serialisiert zu `DwhFactTableSchema`.
- Keine ETL-Logik im Client; Ladung serverseitig.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: `warehouse.test.ts` – Watermark-Inkrement, Idempotenz bei Re-Load, Grain-Validierung.
- Unit: `dwhFactTableSchema.test.ts` – Ablehnung unbekannter sourceEvent.
- Integration: load-Endpoint mit zwei Tenants; Assert Fact-Trennung, kein Cross-Tenant-Laden.
- Security-Test: `dwh:load`/`dwh:configure` blockiert ohne Permission.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Fact/Dimension/Batches zwingend tenantId-gefiltert; Repository verweigert query ohne tenantScope.
- `requireApiPermission("dwh:read" | "dwh:configure" | "dwh:load")`.
- Watermark/Lade-Metadaten ohne Rohdaten-Payload; PII nie im DWH ohne Maskierung.
- DB-Credentials ausschließlich über Core-Secrets; nie in Code/Logs/Docs.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Composite-Index `(tenantId, factTableId, watermarkHigh)` auf `DwhLoadBatch`/Fact-Tabellen.
- ETL asynchron via Queue; p95 load-API-Trigger < 300 ms, Lauf offline.
- Inkrementelle Ladung via Watermark statt Full-Scan; Batch-Größe konfigurierbar.
- Fact-Tables partitioniert nach tenantId + Zeit; VACUUM/Retention nach retentionDays.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
