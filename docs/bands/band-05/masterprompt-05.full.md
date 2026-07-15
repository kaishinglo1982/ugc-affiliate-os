# CarryOS Universe – Band 05
# Masterprompt: Event-System (VOLLSTÄNDIG)

> Band: 5 | Masterprompt: 5.0 | Status: PLANNED | Gruppe: Foundation
> Abhängigkeit: Band 1 (Vision/Strategie)

> Hinweis: Planungs-Masterprompt. Definiert das versionierte Event-System, Outbox-Muster und EventBus-Nutzung für CarryOS Core. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork.

## Kapitel 1 – Architektur

- Ein zentraler EventBus (CarryOS Core), keine zweite Queue/Event-Infrastruktur; Producer/Consumer über Core-Client.
- Outbox-Pattern als verbindlicher Emit-Mechanismus: Events werden transactional mit der Domänenmutation geschrieben.
- Event-Flow: Domain Service → OutboxEvent (DB) → Relay/Worker → EventBus → Consumer (idempotent).
- At-least-once Delivery garantiert; Idempotenz liegt in Consumer-Verantwortung (ExecutionKey/Dedupe).
- Event-System ist tenant-isolierend: Envelope trägt tenantId, Relay filtert streng nach tenantScope.

## Kapitel 2 – Datenmodelle

- `OutboxEvent`: id, tenantId, aggregateType, aggregateId, type (domain.verb.v1), payload (JSON), status (pending/done/dead), createdAt, attempts.
- `DeadLetterEvent`: id, tenantId, originalEventId, reason, payload, createdAt – für nicht verarbeitbare Events.
- `EventSubscription` (optional): tenantId, consumer, lastProcessedId für Replay/Offset-Tracking je Tenant.
- `ExecutionKey`-Dedupe-Tabelle: tenantId, executionKey, resultRef, createdAt (UNIQUE pro tenant).
- Alle Event-Tabellen tenantId-NOT-NULL + Index; kein Event ohne Tenant-Zuordnung.

## Kapitel 3 – APIs

- Event-Publish erfolgt nicht direkt aus API-Route, sondern via Domain Service → Outbox (Route bleibt dünn).
- Konsumierende Endpunkte (Webhooks/Internal) validieren Event-Payload via zentralem Zod-Schema, Version im Typnamen.
- Keine synchronen Event-Aufrufe in Request-Pfad; alles asynchron über Outbox/Relay (Band 10 Envelope für Antworten).
- Event-Contracts als Zod in `packages/core/events`, generiert/referenziert von Producer und Consumer (Single Source).
- Versionierung: `domain.verb.v1`; Consumer unbekannter Version → DeadLetter, niemals Silent-Drop.

## Kapitel 4 – Events

- Namenskonvention strikt: `<domain>.<verb>.v<n>` (z. B. `invoice.paid.v1`, `content.published.v1`).
- Payload nur referenzierende IDs + notwendige Metadaten, keine riesigen Snapshots (Größenbudget < 64KB).
- Versionierte Evolution: `.v2` nur bei Breaking Change; Consumer müssen `.v1` weiterlesen können (Rückwärtskompat).
- Tenant-Isolation: jeder Event trägt tenantId im Envelope, Cross-Tenant-Consume architektonisch verboten.
- Replay-fähig: Outbox-Relay kann nach tenantId + status=done/pending erneut senden, idempotent durch Consumer-Dedupe.

## Kapitel 5 – Workflows

- Workflow-Schritte emitieren Schritt-Events (`workflow.step.completed.v1`) über Outbox; Saga kompensiert bei Fehler.
- Idempotenz: jeder Workflow-Schritt trägt ExecutionKey, Duplicate führt zu No-Op (Dedupe-Tabelle).
- Event-gesteuerte Orchestrierung: Consumer triggert nächsten Schritt, kein zentraler Poller außer Outbox-Relay.
- DeadLetter-Handling: fehlgeschlagene Schritte nach N Attempts in DeadLetter, manuelles/autom. Replay pro Tenant.
- Audit: jede Event-Verarbeitung schreibt AuditLog (tenantId, eventId, consumer, result).

## Kapitel 6 – Agenten

- Agent-Runs publishen `agent.run.started.v1` / `agent.run.completed.v1` über Outbox, tenantId-im-Envelope.
- Agent-Tool-Ergebnisse als `agent.tool.called.v1`, konsumiert von Observability/Finance (Kosten-Tracking).
- Agenten konsumieren nur Events ihres Tenant/Workspace, keine globalen Subscriptions ohne Scope.
- Keine zweite Event-Quelle für Agenten; Band 11 Runtime nutzt Core-EventBus ausschließlich.
- Agent-Event-Dedupe via ExecutionKey, verhindert Doppelausführung bei Relay-Replay.

## Kapitel 7 – UI

- Event-Dashboards (Outbox-Status, DeadLetter, Latenz) lesen über API-DTOs, niemals direkt aus Event-Tabellen.
- Tenant-Scoped Ansichten: Nutzer sieht nur Events seines Tenant/Workspace, Filterung serverseitig.
- Replay-Trigger-UI ruft idempotenten Endpunkt auf (ExecutionKey), keine direkte DB-Manipulation.
- Keine Fachlogik in Client; Event-Darstellung ist read-only Visualisierung.
- Live-Updates via bestehendes Subscription/Streaming (falls vorhanden), nicht via Polling der DB.

## Kapitel 8 – Tests

- Outbox-Test: Mutation + Event in einer Transaktion, Relay sendet exakt einmal (at-least-once verifiziert).
- Consumer-Idempotenz-Test: gleicher Event zweimal → zweite Verarbeitung ist No-Op, State unverändert.
- Tenant-Isolation-Test: Event eines Tenants darf von anderem Tenant-Consumer nie verarbeitet werden (403/ignore).
- Versioning-Test: Consumer alter Version liest neuen Event als DeadLetter, nicht als Crash.
- DeadLetter-Test: corrupt/unknown Event landet in DeadLetter, System bleibt stabil.

## Kapitel 9 – Security

- tenantId im Event-Envelope zwingend; Relay/Consumer lehnen Events ohne/mit fremdem tenantId ab.
- Keine Secrets in Event-Payloads; sensitive Referenzen über IDs, nicht als Werte.
- Event-ACL: nur autorisierte Consumer (requireApiPermission/Scope) dürfen Event-Typ subscriben.
- Audit-Log aller Event-Verarbeitungen tenant-zuordbar, tamper-resistent (Append-Only).
- Replay/Admin-Operationen auditiert + autorisiert, keine ungeprüfte Direkt-Replay-Möglichkeit.

## Kapitel 10 – Performance

- Outbox-Indizes: `(tenantId, status, createdAt)` für Relay-Scan, `(tenantId, executionKey)` für Dedupe.
- Relay batcht Pending-Events pro Tenant, asynchron, p95 Emit-Latenz < 500ms unter Last.
- DeadLetter-Handling asynchron, kein Blockieren des Happy-Path-Relays.
- Event-Payload klein halten (< 64KB), große Daten via Referenz (Object-Store), nicht im Event.
- Partitionierung Outbox/Audit nach tenantId/Zeit bei Wachstum, Connection-Pool geteilt.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests (Outbox/Relay/Idempotenz) grün. 6. Tenant-Isolation-Test grün.
7. Architekturtests: keine zweite Queue/EventBus.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
