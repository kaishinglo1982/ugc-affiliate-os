# CarryOS Universe – Band 89
# Masterprompt: Data Lake (VOLLSTÄNDIG)

> Band: 89 | Masterprompt: 89.0 | Status: PLANNED | Gruppe: Analytics
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Erweitert `src/lib/analytics`. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Bestehende Systeme werden erweitert, nicht dupliziert. Keine zweite Runtime/Engine/Queue/Finance.

- Data-Lake-Catalog in `src/lib/analytics/datalake.ts`: Schema-on-Read-Metadaten für rohe Event-/Objekt-Speicher (Free-Tier-Objektstore, falls vorhanden); keine zweite Storage-Engine, Nutzung bestehender Core-Storage-Abstraktion.
- Ingestion-Connector: landet Events/Exporte als immutable Objects (Append-only, versioniert); tenantId als Prefix/Partition.
- Lake-to-Warehouse-Bridge: bereitet Lake-Objekte für DWH-Ladung (Band 88) auf; keine Doppelverarbeitung.
- Governance: Tagging/Retention/Lifecycle serverseitig; PII-Maskierung vor Landing erzwungen.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `LakeDataset`: tenantId, name, format (json/parquet/csv), sourceConnector, retentionDays, schemaVersion.
- `LakeObject`: tenantId, datasetId, objectKey, sizeBytes, ingestedAt, checksum, schemaVersion.
- `LakeRetentionPolicy`: tenantId, datasetId, ruleJson (Zod-validiert), lastAppliedAt.
- Datasets referenzieren existierende Event-Quellen; Landing schreibt immutable Objects, keine Rohdaten-Mutation.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `GET /api/v1/lake/datasets` – Liste Datasets des Tenants inkl. Format/Retention.
- `POST /api/v1/lake/datasets` – Zod `LakeDatasetSchema` (format/connector validiert); idempotent via ExecutionKey.
- `POST /api/v1/lake/ingest` – Trigger Landing eines Batches; `requireApiPermission("lake:ingest")`.
- `GET /api/v1/lake/objects?datasetId=...` – Objekt-Liste (Metadaten) als Envelope, keine Binärinhalte.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `lake.dataset.registered.v1` / `lake.dataset.deregistered.v1` – Lifecycle.
- `lake.object.ingested.v1` – nach Landing; payload: tenantId, datasetId, objectKey, sizeBytes.
- `lake.retention.applied.v1` – nach Lifecycle-Lauf; payload ohne Objektinhalte.
- Ingestion abonniert `analytics.metric.updated.v1` / Outbox-Events als Landing-Trigger.

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Dataset-Flow: withApiContext → Zod-Validate → requireApiPermission("lake:configure") → Persist → Event → Envelope.
- Ingest-Flow: Validate → PII-Maskierung → immutable Object-Write (tenantId-Prefix) → `LakeObject` Upsert → `lake.object.ingested.v1`.
- Retention-Flow: Policy-Lesen → verfallene Objekte löschen → `LakeRetentionPolicy` Update → `lake.retention.applied.v1`; idempotent via Policy-ExecutionKey.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `lake-curator` Agent: schlägt Dataset-Format/Retention aus Quellprofil vor; in Band 11 Runtime, tenantScoped.
- `lake-guardian` Agent: überwacht PII-Maskierung und Retention-Compliance.
- Keine eigene Agent-Runtime; vollständig tenantScoped.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- `LakeDatasetBrowser`: listet Datasets/Objekte; ruft `/api/v1/lake/*` auf.
- `RetentionPolicyEditor`: konfiguriert Lifecycle; serialisiert zu `LakeDatasetSchema`/Policy.
- `IngestButton`: triggert Landing; reine Aktion, keine Verarbeitungslogik im Client.
- Keine Storage-Logik im Client; Landing serverseitig.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: `datalake.test.ts` – PII-Maskierung, Checksum, Retention-Auswahl, Schema-Version-Check.
- Unit: `lakeDatasetSchema.test.ts` – Ablehnung ungültiger format/connector.
- Integration: ingest-Endpoint mit zwei Tenants; Assert tenantId-Prefix-Trennung, kein Cross-Tenant-Lesen.
- Security-Test: `lake:ingest`/`lake:configure` blockiert ohne Permission.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Datasets/Objects zwingend tenantId-gefiltert (Storage-Prefix + DB-Filter); Repository verweigert query ohne tenantScope.
- `requireApiPermission("lake:read" | "lake:configure" | "lake:ingest")`.
- PII-Maskierung vor Landing obligatorisch; unmaskierte Objekte werden verworfen + gemeldet.
- Storage-Credentials ausschließlich über Core-Secrets; nie in Code/Logs/Docs.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Composite-Index `(tenantId, datasetId, ingestedAt)` auf `LakeObject`.
- Ingestion asynchron via Queue; p95 ingest-API-Trigger < 300 ms, Landing offline.
- Append-only, immutable Objects; kein In-Place-Update (Versionierung via schemaVersion).
- Lifecycle-Lauf nächtlich asynchron; Retention nach retentionDays erzwungen.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
