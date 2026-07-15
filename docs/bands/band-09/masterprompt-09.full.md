# CarryOS Universe – Band 09
# Masterprompt: Workflow Foundation (VOLLSTÄNDIG)

> Band: 9 | Masterprompt: 9.0 | Status: PLANNED | Gruppe: Foundation
> Abhängigkeit: Band 1 (Vision/Strategie)

> Hinweis: Planungs-Masterprompt. Definiert die Workflow-Engine, Prozess-Templates, Idempotenz und Saga-Orchestrierung für CarryOS Core. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork.

## Kapitel 1 – Architektur

- Eine Workflow-Engine (CarryOS Core), keine zweite; Definitionen versioniert als deklarative Artefakte.
- Workflow-Layer zwischen Service und Event: Service startet Run → Engine steuert Schritte → Outbox-Events.
- Prozess-Template verbindlich: Context → Validation → Authorization → Service → Repository → Event → Envelope.
- Idempotenz ist Engine-Feature (ExecutionKey), nicht Aufgabe einzelner Schritte.
- Engine nutzt bestehende Outbox/EventBus (Band 5), keine eigene Queue-Infrastruktur.

## Kapitel 2 – Datenmodelle

- `WorkflowDefinition`: id, tenantId?, name, version, steps (JSON), createdAt – deklarativ, tenant-optional (Core-Templates).
- `WorkflowRun`: id, tenantId, definitionId, version, status (pending/running/done/failed), executionKey, payloadRef, startedBy, createdAt.
- `WorkflowStep`: id, runId, tenantId, stepName, status, attempt, resultRef, startedAt, finishedAt.
- `ExecutionKey`-Dedupe: tenantId, executionKey, resultRef, createdAt (UNIQUE pro tenant) für Idempotenz.
- Saga-State: `step.compensate.v1`-Events referenzieren runId + step, kompensierende Aktion versioniert.

## Kapitel 3 – APIs

- Workflow-Start-Endpunkt: POST `/api/v1/workflows/{definition}/run` mit Zod-validiertem Input + ExecutionKey.
- Status-Endpunkt: GET `/api/v1/workflows/runs/{runId}` liefert Envelope mit Steps/Status (tenant-scoped).
- Start ist idempotent: gleicher ExecutionKey → retourniert bestehenden Run (No-Op), keine Doppelausführung.
- Keine Fachlogik im Handler; Handler delegiert an Workflow-Service, der Engine orchestriert.
- Versionierung im Pfad; Definition-Version im Request-Body, Engine wählt kompatible Version.

## Kapitel 4 – Events

- Schritt-Events: `workflow.step.completed.v1`, `workflow.run.finished.v1`, `workflow.run.failed.v1` über Outbox.
- Kompensations-Events: `workflow.step.compensate.v1` für Saga-Rollback, tenantId-im-Envelope.
- Engine emitieren nur über Outbox (transactional), at-least-once; Consumer idempotent via ExecutionKey.
- Event-Payload referenziert runId/step, keine großen Snapshots; Größenbudget < 64KB.
- Replay: fehlgeschlagene Runs über Outbox-Relay reprozessierbar, Idempotenz schützt vor Duplikaten.

## Kapitel 5 – Workflows

- Schritt-Definition: name, type (service/event/wait), input-mapping, next, onError (retry/compensate).
- Retry-Policy: maxAttempts, backoff, DeadLetter nach Erschöpfung (Band 5).
- Saga-Pattern: bei Schritt-Fehler werden vorherige Schritte kompensiert (reverse order), kein verteilter Commit.
- Long-running: `wait`-Schritte pausieren Run, externes Event (tenant-scoped) setzt fort.
- Audit: jeder Schritt-Übergang schreibt AuditLog (tenantId, runId, step, result).

## Kapitel 6 – Agenten

- Agent-Aktionen sind Workflow-Schritte vom Typ `agent`: Engine ruft Band 11 Runtime mit tenantId-Scope.
- Agent-Schritt trägt executionKey, idempotent bei Relay-Replay; Agent-Run tenant-isoliert.
- Agent-Tools geprüft, Scope im Step-Context injiziert, keine Cross-Tenant-Agent-Aktion.
- Keine zweite Orchestrierung für Agenten; Engine steuert Agent-Schritte zentral.
- Agent-Schritt-Ergebnis als `agent.run.completed.v1`, konsumiert von Observability/Finance.

## Kapitel 7 – UI

- Workflow-Dashboards: Run-Liste/Status lesen über API-DTOs, tenant-scoped, paginiert.
- Step-Visualisierung read-only; Retry/Replay-Trigger ruft idempotenten Endpunkt auf.
- Keine Fachlogik in Client; Mapping/Derivation in Service/Engine.
- Nutzer sieht nur Workflows seines Tenant/Workspace, Filterung serverseitig.
- Design-System aus Core, keine UI-Duplikate.

## Kapitel 8 – Tests

- Idempotenz-Test: Start mit gleichem ExecutionKey zweimal → ein Run, zweiter ist No-Op.
- Step-Test: Schritt mit Retry-Policy schlägt N mal fehl → DeadLetter, Run status=failed.
- Saga-Test: Schritt-2-Fehler kompensiert Schritt-1 korrekt, State konsistent.
- Tenant-Isolation-Test: Run eines Tenants nie für anderen sichtbar/verarbeitbar.
- Engine-Test: Definition-Version-Wechsel kompatibel, alter Run läuft mit seiner Version weiter.

## Kapitel 9 – Security

- Workflow-Start erfordert requireApiPermission(scope), sonst 403; tenantId im Kontext zwingend.
- ExecutionKey enthält tenantId → Isolation schon im Dedupe, Cross-Tenant-Start unmöglich.
- Sensible Schritte (Finance/Permission) audit-pflichtig, manipulierbar nur autorisiert.
- Keine Secrets in Workflow-Payloads; sensitive Referenzen über Handles.
- Compensations/Admin-Operationen auditiert + autorisiert, kein ungeprüftes Replay.

## Kapitel 10 – Performance

- Indizes `(tenantId, executionKey)` Dedupe, `(tenantId, status, createdAt)` Run-Scan, `(runId, stepName)`.
- Engine-Step-Ausführung asynchron über Outbox, p95 Step-Latenz < 500ms unter Last.
- Retry-Backoff verhindert Thundering-Herd; Batch-Processing pro Tenant.
- Run-Status-Query paginiert + indiziert, keine unbounded Scans.
- Connection-Pool geteilt, Workflow-State-Partitionierung nach tenantId/Zeit bei Wachstum.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests (Idempotenz/Saga/Tenant-Isolation) grün.
6. Architekturtests: keine zweite Workflow-Engine/Queue.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
