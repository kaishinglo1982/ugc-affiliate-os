# CarryOS Universe – Band 84
# Masterprompt: Forecasting (VOLLSTÄNDIG)

> Band: 84 | Masterprompt: 84.0 | Status: PLANNED | Gruppe: Analytics
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Erweitert `src/lib/analytics`. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Bestehende Systeme werden erweitert, nicht dupliziert. Keine zweite Runtime/Engine/Queue/Finance.

- Forecast-Engine in `src/lib/analytics/forecasting.ts`: Zeitreihen-Methoden (naive seasonale Baseline, lineare Regression, exponentielles Glätten) als reiner Algorithmus über `metrics.ts`-Zeitreihen; keine externe ML-Pflicht (Free-First).
- Horizon-Manager: definiert Forecast-Fenster (7/30/90 Tage) pro Metrik; tenantId als Partition.
- Forecast-Service als thin Layer; nutzt bestehende Provider nur optional für erweiterte Modelle (Freigabe nötig).
- Ergebnis-Speicherung tenant-isoliert; Consensus über mehrere Methoden (Ensemble-Mean) serverseitig.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `ForecastModel`: tenantId, metricId (FK METRIC_DEFINITIONS), method, horizonDays, seasonality, version, trainedAt.
- `ForecastPoint`: tenantId, modelId, timestamp, predictedValue (Decimal), lowerBound, upperBound, method.
- `ForecastRun`: tenantId, modelId, windowStart, windowEnd, mapeError, durationMs, status.
- Zeitreihen-Basis sind aggregierte Metrik-Snapshots; Forecasting schreibt keine Rohdaten.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `GET /api/v1/forecast/models` – Liste Forecast-Modelle des Tenants inkl. Horizon/Method.
- `POST /api/v1/forecast/models` – Zod `ForecastModelSchema` (metricId validiert, horizonDays ∈ {7,30,90}); idempotent via ExecutionKey.
- `POST /api/v1/forecast/infer` – `ForecastRequestSchema` (modelId, from, to); Antwort mit Point-Array + Bounds als Envelope.
- `GET /api/v1/forecast/models/:id/accuracy` – Backtest-MAPE via `requireApiPermission("forecast:read")`.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `forecast.model.built.v1` – nach Modell-Aufbau; payload: tenantId, modelId, method, horizonDays.
- `forecast.point.computed.v1` – Batch nach Inference; Metadaten ohne Rohdaten.
- `forecast.accuracy.evaluated.v1` – nach Backtest; payload: modelId, mapeError.
- Forecast-Refresh abonniert `analytics.metric.updated.v1` für rollierende Fenster.

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Build-Flow: withApiContext → Zod-Validate → requireApiPermission("forecast:configure") → Zeitreihen-Lesen → Method-Fit → `ForecastModel` Persist → Event.
- Infer-Flow: Validate → Modell-Laden (tenantScoped) → Punkt-Berechnung → `ForecastPoint` Upsert → Envelope (Array + Bounds).
- Backtest-Flow: holdout-Fenster → MAPE → `ForecastRun` → `forecast.accuracy.evaluated.v1`.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `forecast-planner` Agent: wählt Methode nach Saisonalität/Datenmenge; in Band 11 Runtime, tenantScoped.
- `forecast-reviewer` Agent: kommentiert Abweichungen zwischen Forecast und Ist natürlichsprachig.
- Keine eigene Agent-Runtime; Free-First-Methoden-Default (kein Premium ohne Freigabe).

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- `ForecastChart`: rendert Ist + Forecast + Bounds; reine Präsentation der `ForecastPoint`s.
- `ForecastModelPanel`: Konfiguration Methode/Horizon; ruft `/api/v1/forecast/*` auf.
- `AccuracyBadge`: zeigt MAPE aus `ForecastRun`; keine Berechnung im Client.
- Keine Forecast-Algorithmen im Client; alle Werte serverseitig.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: `forecasting.test.ts` – seasonale Baseline, Regression, Glättung; `safeRatio`-konform, Decimal-Präzision.
- Unit: `forecastModelSchema.test.ts` – Ablehnung ungültiger horizonDays, unbekannter metricId.
- Integration: infer-Endpoint mit zwei Tenants; Assert Tenant-Trennung der ForecastPoints.
- Security-Test: `forecast:configure` blockiert ohne Permission.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Forecast-Modelle/Points zwingend tenantId-gefiltert; Repository verweigert query ohne tenantScope.
- `requireApiPermission("forecast:read" | "forecast:configure" | "forecast:infer")`.
- Bounds/Points enthalten keine Rohdaten; nur aggregierte Metrik-Werte.
- Provider-Keys (optional) ausschließlich über Core-Secrets.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Composite-Index `(tenantId, modelId, timestamp)` auf `ForecastPoint`.
- Forecast-Berechnung asynchron via Queue; p95 infer < 700 ms über gecachte Modelle.
- ForecastPoints pro (modelId, horizon) gecached; Invalidierung bei neuem Run.
- Nutzung voraggregierter Tages-Snapshots statt Roh-Event-Scans.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
