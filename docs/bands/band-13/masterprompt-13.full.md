# CarryOS Universe – Band 13
# Masterprompt: Growth & Marketing OS (VOLLSTÄNDIG)

> Band: 13 | Masterprompt: 13.0 | Status: DOCUMENTED | Gruppe: Core Intelligence
> Abhängigkeit: Band 10 (API Governance), Band 11 (Agentic OS), Band 12 (Content Factory)

> Hinweis: Dieser Band hat Code-Bezug im Repository; Masterprompt verweist auf bestehende Module in `src/lib/recommendation/` und `src/lib/observability/`.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Growth & Marketing OS steuert Empfehlungen, Experimente und Reichweiten-Optimierung. Bestehende Regel-Engine in `src/lib/recommendation/rules.ts` wird erweitert. Keine zweite Runtime/Engine/Queue/Finance.

- Empfehlungs-Pipeline: `recommendation.rules.ts` als einzige Regelquelle; neue Heuristiken als Regel-Funktionen, nicht als zweites Modul.
- Experiment-Framework (A/B) baut auf Observability-Metriken (`experimentStartedTotal`, `experimentCompletedTotal`) auf; keine eigene Stats-Engine.
- Growth-Loops werden über Band-11-Agenten getriggert (`src/server/services/agents.ts`), nicht über Cron-Duplikate.
- Attribution und Conversion-Tracking erfolgen tenant-isoliert; keine fachfremde Finanz-Engine.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `Recommendation` (status: GENERATED/ACCEPTED/REJECTED/EXPIRED), `Experiment` (status: STARTED/COMPLETED/INCONCLUSIVE).
- `GrowthChannel`, `AttributionEvent` mit `tenantId`, `workspaceId`, `correlationId`.
- Metriken-Dimension `recommendationGeneratedTotal` etc. aus `src/lib/observability/metrics.ts` als Quelle für Aggregationen.
- Alle Reads über Repository mit zwingendem `tenantId`-Filter; Experiment-Sample-Size nur tenant-scoped.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `POST /api/v1/recommendations/generate` – erzeugt Empfehlung via `rules.ts`, liefert `recommendationGeneratedTotal`.
- `POST /api/v1/recommendations/:id/accept|reject` – Status-Transition, auditierbar (ACCEPTED/REJECTED).
- `POST /api/v1/experiments/start` – startet A/B-Test, emittiert `experimentStartedTotal`.
- `POST /api/v1/experiments/:id/complete` – wertet aus, setzt COMPLETED/INCONCLUSIVE, liefert `experimentSampleSize`.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `recommendation.generated.v1` – Payload `recommendationId`, `confidence`, `channel`.
- `recommendation.accepted.v1` / `recommendation.rejected.v1` / `recommendation.expired.v1` – Lifecycle-Events.
- `experiment.started.v1` / `experiment.completed.v1` / `experiment.inconclusive.v1` – Test-Lifecycle.
- `growth.loop.triggered.v1` – von Band-11-Agent ausgelöst, für Nachvollziehbarkeit.

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Recommend-Flow: `withApiContext` → Zod → `requireApiPermission("growth:recommend")` → `rules.ts`-Evaluierung → Persistenz → `recommendation.generated.v1`.
- Accept/Reject-Flow: Status-Update idempotent via ExecutionKey → Metrik `recommendationAcceptedTotal`/`rejectedTotal`.
- Experiment-Flow: Start → Sample-Size-Sampling → Complete (Statistik über Observability-Werte) → Event.
- Keine Fachlogik in Route Handlern; Regeln ausschließlich in `src/lib/recommendation/`.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime.

- `growth-optimizer` Agent: periodische Empfehlungsgenerierung und Loop-Trigger.
- `experiment-runner` Agent: verwaltet STARTED→COMPLETED-Übergänge, nutzt `agentRun`.
- `attribution-analyst` Agent (lesend): korreliert `AttributionEvent` mit `correlationId`.
- Tools in `agentToolDefinition` registriert; Policies begrenzen Schreibzugriff auf Experimente.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- Empfehlungs-Board: LISTE von Empfehlungen mit Accept/Reject-Buttons (Status-Transition serverseitig).
- Experiment-Dashboard: Start/Complete-Controls, Anzeige `experimentSampleSize` und `experimentDurationHours`.
- Growth-Metriken: Karten für `recommendationAcceptedTotal` vs `generatedTotal` (Acceptance-Rate).
- Attribution-View: Funnel nach `AttributionEvent`, tenant-isoliert.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: Regeln in `rules.ts` liefern deterministische Empfehlungen für definierte Inputs.
- Integration: Generate→Accept-Flow end-to-end mit Tenant-Kontext; Metriken inkrementieren korrekt.
- Security: Cross-Tenant-Zugriff auf fremde `Recommendation`/`Experiment` → 403.
- Experiment-Edge: Complete ohne Start → 409; doppeltes Complete idempotent (ExecutionKey).

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- `requireApiPermission("growth:recommend|growth:experiment")` auf Endpunkten.
- `correlationId`/`workspaceId` Pflicht in allen Logs (`logStructured` aus Observability).
- Tracking-URLs in Attributionsdaten werden via `redact` maskiert (`[TRACKING_URL_REDACTED]`).
- Keine Budget- oder Steuerlogik hier — das ist Band 14 (Finance).

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `Recommendation(tenantId, status, createdAt)`, `Experiment(tenantId, status)`.
- Empfehlungsgenerierung asynchron; `optimizationQueueLagSeconds` als p95-Ziel (<30s).
- Experiment-Auswertung cached Ergebnis pro `experimentId` (tenant-scoped, kurzlebig).
- Metrik-Aggregation nutzt `getMetricsSnapshot()` aus Observability, kein separates Store.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Regel-Logik ausschließlich in `src/lib/recommendation/`.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
