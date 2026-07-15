# CarryOS Universe – Band 83
# Masterprompt: Predictive Analytics (VOLLSTÄNDIG)

> Band: 83 | Masterprompt: 83.0 | Status: PLANNED | Gruppe: Analytics
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Erweitert `src/lib/analytics`. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Bestehende Systeme werden erweitert, nicht dupliziert. Keine zweite Runtime/Engine/Queue/Finance.

- Modell-Registry in `src/lib/analytics/predictive.ts`: versionierte `ModelDefinition` (algorithm, features, target, version) mit Free-First-Provider-Bindung (kein Premium ohne Freigabe).
- Feature-Pipeline: transformiert bestehende Event-Metriken (`metrics.ts`) in trainierbare Feature-Sets; tenantId als Group-Key, keine Cross-Tenant-Leaks.
- Inference-Service als thin Layer über bestehende Provider-Abstraktion (`src/lib/analytics/provider`); keine eigene ML-Runtime.
- Modell-Artefakte tenant-isoliert gespeichert; Training asynchron via Core-Queue.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `PredictiveModel`: tenantId, name, targetMetricId (FK METRIC_DEFINITIONS), algorithm, featureSetJson, version, status, trainedAt.
- `PredictionResult`: tenantId, modelId, entityRef (z.B. contentId/campaignId), predictedValue (Decimal), confidence, horizon, computedAt.
- `ModelTrainingRun`: tenantId, modelId, dataSourceHash, rowsUsed, lossMetric, durationMs, status.
- Feature-Sets referenzieren ausschließlich existierende Metriken; keine Rohdaten-Duplikate.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `GET /api/v1/predictive/models` – Liste trainierter Modelle des Tenants inkl. Status/Version.
- `POST /api/v1/predictive/models` – Zod `ModelDefinitionSchema` (targetMetricId validiert), Training trigger asynchron, idempotent via ExecutionKey.
- `POST /api/v1/predictive/infer` – `InferenceRequestSchema` (modelId, entityRef, horizon); Antwort mit predictedValue + confidence.
- `GET /api/v1/predictive/models/:id/runs` – Training-Run-Historie mit `requireApiPermission("predictive:read")`.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `predictive.model.trained.v1` – nach Training; payload: tenantId, modelId, version, lossMetric.
- `predictive.prediction.computed.v1` – nach Inference; payload ohne Rohdaten, nur Metadaten.
- `predictive.model.deprecated.v1` – bei neuer Version; alte Artefakte bleiben auditierbar.
- Training-Runs abonnieren `analytics.metric.updated.v1` als Feature-Refresh-Trigger.

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Training-Flow: withApiContext → Zod-Validate → requireApiPermission("predictive:train") → Feature-Build → Provider-Train → `ModelTrainingRun` Persist → `predictive.model.trained.v1`.
- Inference-Flow: Validate → Modell-Laden (tenantScoped) → Provider-Infer → `PredictionResult` Upsert → Envelope.
- Deprecation-Flow: neue Version → alter Status deprecated → Cache-Invalidate → Audit-Event.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `predictive-trainer` Agent: wählt Feature-Set und Algorithmus nach Datenlage; in Band 11 Runtime, tenantScoped.
- `predictive-explainer` Agent: interpretiert confidence/feature-Importance natürlichsprachig (keine Rohdaten-Exfiltration).
- Keine eigene Agent-Runtime; Free-First-Provider-Policy erzwungen.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- `ModelListPanel`: zeigt Modelle/Version/Status; ruft `/api/v1/predictive/*` auf.
- `PredictionBadge`: rendert predictedValue + confidence aus `PredictionResult`; reine Präsentation.
- `FeatureConfigurator`: wählt Metriken als Features, serialisiert zu `ModelDefinitionSchema`.
- Keine Modell-Logik im Client; Inference erfolgt serverseitig.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: `predictive.test.ts` – Feature-Build, Schema-Validation, confidence-Bereich [0,1].
- Unit: `provider/inference.test.ts` – Mock-Provider liefert deterministische Werte, Decimal-Präzision.
- Integration: infer-Endpoint mit zwei Tenants; Assert Modell A nicht für Tenant B nutzbar.
- Security-Test: `predictive:train` blockiert ohne Permission; Cross-Tenant-Modellzugriff verweigert.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Modelle und Predictions zwingend tenantId-gefiltert; Repository verweigert query ohne tenantScope.
- `requireApiPermission("predictive:read" | "predictive:train" | "predictive:infer")`.
- Keine personenbezogenen Rohdaten in Feature-Sets; Aggregation auf Metrik-Ebene.
- Provider-API-Keys ausschließlich über Core-Secrets; nie in Code/Logs/Docs.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Composite-Index `(tenantId, modelId, version)` auf `PredictiveModel`/`PredictionResult`.
- Training asynchron via Queue (kein Sync-Blocking); p95 Inference < 600 ms (gecachte Modelle).
- Prediction-Results pro entityRef kurzfristig gecached (TTL je horizon).
- Feature-Build nutzt voraggregierte Cubes (Band 81) statt Roh-Event-Scans.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
