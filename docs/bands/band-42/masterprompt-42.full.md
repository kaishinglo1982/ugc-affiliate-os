# CarryOS Universe – Band 42
# Masterprompt: Sales Pipeline (VOLLSTÄNDIG)

> Band: 42 | Masterprompt: 42.0 | Status: PLANNED | Gruppe: Commerce & Sales
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork erlaubt

> Hinweis: Fachmodul baut ohne Fork auf CarryOS Core auf. Nutzt CRM (Band 41) als Quelle, Finance (Band 14) für Forecast-Werte.

## Kapitel 1 – Architektur

- Pipeline-Modul als Package `src/modules/commerce/pipeline/`; keine eigene DB, kein eigener EventBus, keine zweite Workflow-Engine.
- Stages, Deals und Forecast sind fachliche Aggregate über die Core-Repository-Schicht mit `tenantId`-Filter.
- Gewinn-Wahrscheinlichkeit und Forecast-Werte werden berechnet, aber Geldflüsse/Rechnungen delegieren an Band 14.
- Nutzt Band-11-Agenten für Stage-Vorschläge und Stagnations-Erkennung.

## Kapitel 2 – Datenmodelle

- Entität `PipelineDeal` (id, tenantId, accountId, ownerAgentId, stageId, amountGrossEnc, currency, probabilityPct, closeDateExpected, sourceLeadId, lostReason) – verschlüsselter Betrag, kein Klartext-Geldwert im Modul.
- Entität `PipelineStage` (id, tenantId, name, orderIndex, isWon, isLost, defaultProbability) – konfigurierbare Verkaufsphasen.
- Entität `PipelineActivity` (id, tenantId, dealId, type, dueAt, completedAt, assignedAgentId) – Aufgaben/Tasks pro Deal.
- Entität `PipelineForecastSnapshot` (id, tenantId, period, weightedAmountEnc, createdAt) – periodischer Forecast.
- Alle Modelle zwingend `tenantId`; Schema-Erweiterung nur im Commerce-Namespace.

## Kapitel 3 – APIs

- `GET /api/v1/commerce/pipeline/deals?stageId=&owner=` – Deals mit Filter, paginiert, tenant-isoliert.
- `POST /api/v1/commerce/pipeline/deals` – Deal anlegen; Zod `pipelineDealCreateSchema`, Envelope, `withApiContext`.
- `PATCH /api/v1/commerce/pipeline/deals/:id/stage` – Stage-Wechsel; triggert `pipeline.deal.stage.changed.v1`.
- `GET /api/v1/commerce/pipeline/forecast` – gewichteter Forecast aus Snapshots und offenen Deals.
- `POST /api/v1/commerce/pipeline/activities` – Task erfassen; `pipeline.activity.due.v1` bei Fälligkeit.

## Kapitel 4 – Events

- `pipeline.deal.created.v1` – nach Deal-Erstellung; referenziert `accountId` und `sourceLeadId`.
- `pipeline.deal.stage.changed.v1` – bei Phasenwechsel inkl. `isWon`/`isLost`; konsumiert von CRM und Forecast.
- `pipeline.deal.won.v1` – bei Eintritt in Won-Stage; triggert Handover an Band 43 (Customer Success).
- `pipeline.activity.due.v1` – Task-Fälligkeit; für Agent-Reminder.
- Events versioniert über Outbox; Geldbeträge nur verschlüsselt/aggregiert im Payload.

## Kapitel 5 – Workflows

- Deal-Erstellung: ApiContext → Zod → requireApiPermission(pipeline:write) → PipelineService.create → Repository → Outbox → Envelope.
- Stage-Wechsel: Service → Probability-Update → Snapshot-Invalidierung → Event; idempotent via ExecutionKey.
- Forecast-Berechnung: scheduled → offene Deals aggregieren (amountGrossEnc gewichtet) → Snapshot-Persistenz.
- Won-Handover: `pipeline.deal.won.v1` → Band-43-Consumer → Onboarding-Aufgabe; keine Logik im Handler.

## Kapitel 6 – Agenten

- `PipelineStageAgent`: schlägt nächste Stage und Probability auf Basis von Aktivitäten-Historie vor.
- `PipelineStallAgent`: erkennt Deals ohne Aktivität > Schwellwert und erzeugt Reminder-Task.
- `PipelineForecastAgent`: berechnet gewichteten Forecast und markiert Abweichungen zum Ziel.
- Registrierung in Band-11-Runtime; keine eigene LLM-Infrastruktur.

## Kapitel 7 – UI

- `PipelineBoard` (Kanban) zeigt Deals je Stage, gefiltert nach `tenantId`; DnD löst Stage-API aus.
- `DealDetail` rendert Aktivitäten, Beträge (decrypted server-seitig) und Forecast-Beitrag.
- `ForecastView` visualisiert Snapshots; reine Darstellung, keine Berechnung im Client.
- Komponenten unter `src/modules/commerce/pipeline/ui/`, konsumieren nur v1-APIs.

## Kapitel 8 – Tests

- Unit (Vitest): Probability-Default-Logik, Forecast-Gewichtung, Stall-Erkennung.
- Integration: Deal-Stage-Wechsel bis Event in Outbox; Tenant-Isolation über zwei Tenants.
- Security: Scope-Verweigerung, verschlüsselter Betrag nie im Klartext-Log, Cross-Tenant blockiert.
- Fehlerpfade: ungültige Stage, negative Beträge, fehlender Owner.

## Kapitel 9 – Security

- Auth über Core (keine zweite); Autorisierung via `requireApiPermission` (`pipeline:read`, `pipeline:write`).
- Tenant-Isolation durchgehend; Geldbeträge verschlüsselt (`amountGrossEnc`), nie in Logs/Prompts.
- Audit über Band-10 für Stage-Wechsel und Deal-Erstellung; Secrets außerhalb von Code/Docs.

## Kapitel 10 – Performance

- Indizes auf `(tenantId, stageId, closeDateExpected)`, `(tenantId, ownerAgentId)`.
- Forecast-Snapshots asynchron; Board-Queries nutzen Materialized-Cursor, p95 < 250 ms.
- Bulk-Stage-Updates batchweise; keine N+1-Queries beim Laden von Aktivitäten.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines, keine Core-Fork.
7. Tenant-Isolation-Test grün. 8. Encryption-Verifizierung für Geldbeträge.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
