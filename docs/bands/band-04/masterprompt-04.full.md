# CarryOS Universe – Band 04
# Masterprompt: Datenmodell (VOLLSTÄNDIG)

> Band: 4 | Masterprompt: 4.0 | Status: PLANNED | Gruppe: Foundation
> Abhängigkeit: Band 1 (Vision/Strategie)

> Hinweis: Planungs-Masterprompt. Definiert Prisma-Schema-Konventionen, tenant-isoliertes Datenmodell und Migration-Strategie für CarryOS Core. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork.

## Kapitel 1 – Architektur

- Schema-Layer liegt ausschließlich in `packages/core/prisma`; Editionsmodule erweitern via Migration, nicht via Fork des Basisschemas.
- Datenzugriff nur über Repository-Schicht; keine Raw-Queries in Services oder Routes, keine ORM-Umgehung.
- Tenant-Isolation ist Schema-Eigenschaft: jede mandantenrelevante Tabelle hat NOT-NULL `tenantId` + zusammengesetzten Index.
- Versionierte Datenkonzepte (Soft-Delete via `deletedAt`, Audit via `createdBy/updatedBy`) zentral im Core-Schema definiert.
- Keine zweite Persistenz-Strategie; Prisma ist einzige ORM-Schicht, Migrationen sind einzige Schema-Änderungsquelle.

## Kapitel 2 – Datenmodelle

- Basis-Entitäten: Tenant, Workspace, User, Role, Permission, AuditLog, OutboxEvent – alle tragen tenantId (außer Tenant selbst).
- Aggregates: Finance (Invoice, LedgerEntry), Content (Asset, Campaign), Agentic (AgentRun, ToolCall) je als eigener Context mit tenantId.
- Value Objects als Typen: `TenantId`, `WorkspaceId`, `Money` (Betrag + Währung), `ExecutionKey` (tenantId+businessKey+intent).
- Relations immer tenant-gebunden: FKs implizit über tenantId-Scope, Cross-Tenant-Queries architektonisch verboten.
- Soft-Delete Standard: `deletedAt DateTime?` statt physikalischem Löschen für auditierbare Entitäten.

## Kapitel 3 – APIs

- Daten-Contracts (Create/Update/Read) als Zod-Schemas, generiert aus/abgeleitet von Prisma-Typen, mit tenantId-Scope.
- Endpunkte geben niemals rohe DB-Objekte zurück: Mapping Repository → DTO → Envelope (Band 10).
- Pagination/Filterung server-validiert via Zod, niemals client-gesteuerte Raw-Filter auf DB-Ebene.
- Mutation-Endpunkte idempotent: `ExecutionKey` wird persistiert, Duplicate führt zu No-Op mit Original-Result.
- Versionierung im Pfad; Schema-Änderungen triggern neue API-Version bei Breaking Change.

## Kapitel 4 – Events

- `OutboxEvent`-Tabelle als Single Source für alle Domain Events: id, aggregateType, aggregateId, type, payload (JSON), tenantId, status.
- Event-Payloads referenzieren Domänenentitäten über IDs, nie als vollständige Snapshots bei großen Aggregates.
- Outbox wird transactional mit der Mutation geschrieben (same DB transaction) → garantiert at-least-once Emit.
- Event-Typen versioniert (`entity.created.v1`); Consumer validieren via zentralem Zod-Schema aus Core.
- Tenant-Isolation: Outbox-Replay filtert zwingend nach tenantId, kein mandantenübergreifender Replay.

## Kapitel 5 – Workflows

- Workflow-State wird als tenant-isoliertes `WorkflowRun`-Aggregate persistiert (status, step, executionKey, payloadRef).
- Idempotenz: `UNIQUE(tenantId, executionKey)` in Outbox/WorkflowRun verhindert Double-Execution.
- Saga-Schritte speichern kompensierende Aktion als Event (`step.compensate.v1`) für Rollback-Sicherheit.
- Datenmigrationen für Workflow-State sind versioniert und rollback-fähig (down-Migration Pflicht bei kritischen Feldern).
- Audit-Trigger: kritische Mutationen schreiben `AuditLog`-Row (tenantId, actor, entity, before/after hash).

## Kapitel 6 – Agenten

- `AgentRun`-Aggregat: tenantId, agentRole, status, inputRef, outputRef, workspaceId, startedBy.
- Agent-Tool-Aufrufe als `ToolCall`-Rows (tenantId, runId, tool, args hash, resultRef) für Nachvollziehbarkeit.
- Agent-Datenzugriff nur über Repository mit injiziertem tenantId, niemals direkte Tabellen-Queries.
- Agent-State ist tenant-isolierter Teil des Workflow-State, keine globale Agent-Tabelle ohne Scope.
- Keine zweite Datenhaltung für Agenten; Band 11 Runtime nutzt dieselben Core-Repositories.

## Kapitel 7 – UI

- UI liest ausschließlich über API-DTOs (Envelope), nie direkt aus Schema; Listen sind paginiert und tenant-gefiltert.
- Formulare validieren gegen dieselben Zod-Schemas wie API (Shared Validation), clientseitig nur als UX, serverseitig verbindlich.
- Tabellen/Views zeigen nur Daten des autorisierten Tenant/Workspace, Filterung serverseitig erzwungen.
- Keine Fachlogik in Client Components; Mapping/Derivation erfolgt in Service/Repository.
- Audit-sichtbare Entitäten zeigen nur metadaten (wer/wann), keine sensitiven Felder im Client-Cache.

## Kapitel 8 – Tests

- Schema-Tests: Prisma-Migration-Dry-Run in CI, prüft dass jede neue Tabelle tenantId + Index besitzt.
- Repository-Tests mit Tenant-Fixtures: verifizieren dass Query eines Tenants niemals Daten eines anderen liefert.
- Outbox-Tests: schreiben Mutation + Event in einer Transaktion, Replay liefert exakt die Events des Tenants.
- Idempotenz-Tests: gleicher ExecutionKey zweimal → zweiter Aufruf ist No-Op, Result identisch.
- Architekturtests: verbieten Raw-Queries außerhalb Repository, fehlende tenantId in Migrationen.

## Kapitel 9 – Security

- tenantId NOT-NULL + Index auf allen mandantenrelevanten Tabellen; DB-Level-Check (Prisma validator) als zweite Barriere.
- Secrets/PII niemals als Plain-Text in DB; sensible Felder über Secret-Store referenziert, nicht gespeichert.
- AuditLog unveränderbar (Append-Only), kritische Mutationen zwingend erfasst, tenant-zuordbar.
- Row-Level-Isolation im Repository erzwungen: Query-Builder injiziert tenantId automatisch, manuelles Entfernen verboten.
- Migrationen dürfen keine Daten exponieren (kein SELECT in Logs), keine Secrets in Migration-Skripten.

## Kapitel 10 – Performance

- Verpflichtende Indizes: `(tenantId)`, `(tenantId, createdAt)`, `(tenantId, executionKey)` für Outbox/Workflow.
- Composite-Index-Design vermeidet Full-Table-Scan je Tenant; p95-Query-Ziel < 50ms für Lookup-by-tenant.
- Partitionierung der Outbox/AuditLog nach tenantId oder Zeit vorgesehen bei Wachstum (Migrationsplan).
- Connection-Pooling zentral konfiguriert; Editionspackages teilen Pool, keine eigenen DB-Verbindungen.
- N+1-Prävention in Repositories (include/select korrekt), Batch-Lade für Aggregate-Children.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Migration-Dry-Run grün (tenantId-Check). 5. Unit-Tests grün. 6. Integrationstests (Tenant-Isolation) grün.
7. Architekturtests: keine Raw-Queries außerhalb Repository.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
