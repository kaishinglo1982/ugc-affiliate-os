# CarryOS Universe – Band 08
# Masterprompt: Multi-Tenant (VOLLSTÄNDIG)

> Band: 8 | Masterprompt: 8.0 | Status: PLANNED | Gruppe: Foundation
> Abhängigkeit: Band 1 (Vision/Strategie)

> Hinweis: Planungs-Masterprompt. Definiert Tenant- und Workspace-Isolation als erstklassiges Architekturprinzip für CarryOS Core. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork.

## Kapitel 1 – Architektur

- Tenant-Isolation ist Architekturprinzip, nicht Feature: jeder Request/Event/Cache/DB-Zugriff trägt tenantId.
- Workspace-Isolation als zweite Ebene: Nutzer agieren innerhalb eines Workspace eines Tenant, Scope kombiniert.
- Context-Propagation: tenantId + workspaceId werden zentral (withApiContext) injiziert, nicht manuell durchgereicht.
- Keine mandantenübergreifenden Query-Ergebnisse: Repository-Layer injiziert tenantId-Filter automatisch.
- Isolation wird durch Architekturtests erzwungen, nicht nur durch Disziplin – Verstöße brechen den Build.

## Kapitel 2 – Datenmodelle

- `Tenant` (Root, keine tenantId), `Workspace` (tenantId), alle weiteren Entitäten (tenantId + ggf. workspaceId).
- `TenantMembership`: userId, tenantId, role, status – verknüpft User mit Tenant, Basis für Scope.
- `WorkspaceMembership`: userId, workspaceId, tenantId, role – feingranularere Rechte.
- Jede tenant-relevante Tabelle: `tenantId String NOT NULL` + Composite-Index `(tenantId, ...)`.
- Workspace-gebundene Daten tragen zusätzlich workspaceId; Cross-Workspace-Zugriff analog verboten.

## Kapitel 3 – APIs

- withApiContext extrahiert tenantId + workspaceId aus Token/Membership, validiert Zugehörigkeit.
- Endpunkte ohne tenantId im Kontext → 401/403, niemals impliziter Global-Scope.
- Alle Query-Parameter werden auf Tenant-Scope geprüft; Filter nach fremdem Tenant → 403.
- Response enthält nie Felder anderer Tenants, auch nicht "leer" indiziert (kein enumeration leak).
- Versionierung im Pfad; tenantId nie Teil des Pfads als Trust-Grenze (kommt aus Auth, nicht aus URL).

## Kapitel 4 – Events

- Event-Envelope trägt tenantId + workspaceId; Relay/Consumer filtern streng nach tenantScope.
- Cross-Tenant-Event-Consume architektonisch verboten; fremde Events werden verworfen/ignoriert.
- Tenant-Isolation bei Replay: Outbox-Relay replays nur Events des autorisierten Tenant.
- Event-Payloads referenzieren nur Entitäten innerhalb desselben Tenant, keine Fremd-Referenzen.
- Security-Event `tenant.isolation.violation.v1` bei erkanntem Scope-Verstoß (Band 7).

## Kapitel 5 – Workflows

- Workflow-ExecutionKey enthält tenantId (tenantId + businessKey + intent), Isolation schon im Dedupe.
- Workflow-State (WorkflowRun) strikt tenantId-gebunden, kein Geteiltes State zwischen Tenants.
- Saga-Schritte operieren nur innerhalb eines Tenant, kompensierende Events tenant-scoped.
- Tenant-Provisioning-Workflow: neuer Tenant → Workspace + Basis-Rollen + Membership (idempotent).
- Audit aller tenant-relevanten Workflow-Schritte mit tenantId + actor (Band 7).

## Kapitel 6 – Agenten

- Agent-Context zwingend tenantId + workspaceId; Agenten agieren nur im autorisierten Scope.
- Agent-Tools prüfen Tenant-Scope vor Ausführung, ungeprüfte Cross-Tenant-Aktion per Lint verboten.
- Keine globalen Agent-Subscriptions ohne tenantScope; Band 11 Runtime isoliert pro Tenant.
- Agent-Runs tenant-isoliert persistiert (AgentRun.tenantId), keine gemeinsame Agent-Tabelle ohne Scope.
- Agent-Eskalation bei Scope-Verstoß → `tenant.isolation.violation.v1` + Abbruch.

## Kapitel 7 – UI

- UI zeigt nur Daten des autorisierten Tenant/Workspace, Filterung serverseitig erzwungen.
- Tenant/Workspace-Wechsel nur über autorisierte Membership, nie clientseitig erzwungen.
- Keine tenantId im Client-State als Trust-Grenze; Scope kommt aus Server-Kontext.
- Admin-Ansichten (Tenant-Config) nur für berechtigte Rollen, sonst 403.
- Design-System aus Core, keine UI-Duplikate die Isolation umgehen (z. B. globale Suche über Tenants).

## Kapitel 8 – Tests

- Tenant-Escalation-Test: User A greift auf Daten von B → 403/404, Assert dass keine Datenleak.
- Repository-Test: Query eines Tenants liefert niemals Rows eines anderen (Fixtures mit 2 Tenants).
- Event-Test: Consumer verarbeitet nur Events seines Tenant, fremde werden ignoriert.
- Context-Injection-Test: withApiContext ohne gültige Membership → 401/403.
- Architekturtest: Migration ohne tenantId-Index → Build-Fehler; Query ohne Filter → Lint-Fehler.

## Kapitel 9 – Security

- tenantId NOT-NULL + Index auf allen mandantenrelevanten Tabellen; DB-Constraint als zweite Barriere.
- Row-Level Isolation im Repository: Query-Builder injiziert tenantId automatisch, manuelles Entfernen verboten.
- Secrets niemals tenant-übergreifend sichtbar; Secret-Store scoped pro Tenant.
- Audit-Logs tenant-zuordbar, kein Tenant kann Logs eines anderen einsehen.
- Isolation-Verstöße triggern Security-Event + Alarmierung (Band 7), keine Silent-Fail.

## Kapitel 10 – Performance

- Indizes `(tenantId)`, `(tenantId, workspaceId)`, `(tenantId, createdAt)` verpflichtend für Hot Paths.
- Connection-Pool geteilt, aber Query-Scope immer tenantId → verhindert Cross-Tenant-Scans.
- Cache-Keys enthalten tenantId + workspaceId, niemals globaler Cache mit Tenant-Daten.
- p95-Query < 50ms für tenant-scoped Lookup; Query-Plan-Check in Integrationstests.
- Tenant-Provisioning asynchron (Workflow), blockiert keine Request.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün (Isolation-Architekturtests). 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests (Tenant-Escalation) grün. 6. Event-Isolation-Test grün.
7. Migration-Check: jede Tabelle tenantId + Index.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
