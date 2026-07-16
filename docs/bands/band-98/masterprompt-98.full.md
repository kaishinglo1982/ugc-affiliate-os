# CarryOS Universe – Band 98
# Masterprompt: Migration Toolkit (VOLLSTÄNDIG)

> Band: 98 | Masterprompt: 98.0 | Status: PLANNED | Gruppe: Developer Platform
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

## Kapitel 1 – Architektur

- Das Migration Toolkit (`@carryos/migrate`) ist ein satzweise ausführbares Werkzeug für Schema-, Daten- und Tenant-Migrationen, das Prisma-Migrations und Band-10-Outbox kombiniert – kein Core-Fork, nutzt bestehende Repository-Layer.
- Bestandteile: `SchemaMigrator` (Prisma), `DataMigrator` (Batch über Repository), `TenantMover` (Workspace-Isolation), `ContractUpgrader` (vN→vN+1).
- Alle Migrationen sind idempotent und versioniert (`migration.name.v1`), ausführbar via `carry migrate up/down/status`.
- Dry-Run-Modus simuliert Änderungen ohne Write; Checkpointing erlaubt Resume bei Abbruch.
- Keine eigene Engine – nutzt Prisma + Band-10-Services; Audit aller kritischen Schritte via Audit-Center.

## Kapitel 2 – Datenmodelle

- `MigrationManifest` trägt `{ id, version, tenantScoped, dependsOn[], checksum }`, validiert per Zod.
- `DataBatch<T>` modelliert satzweise Verarbeitung mit Cursor/Offset und tenantId-Filter (Isolation gewahrt).
- `TenantMovePlan` erfasst Quell-/Ziel-Workspace, betroffene Tabellen, Row-Count-Schätzung.
- `ContractUpgrade` bildet vN→vN+1 Mapping (Feld-Umbenennung, Default, Deprecation) als deklarative Spec.
- `MigrationCheckpoint` speichert Fortschritt pro Tenant, ermöglicht resumable Runs ohne Doppel-Write.

## Kapitel 3 – APIs

- CLI-Befehle mappen auf Toolkit-Services: `carry migrate up --tenant` ruft `DataMigrator` mit Scope auf.
- Jede Migration schreibt Status via Band-10-Envelope-Log; `carry migrate status` liest `MigrationManifest`.
- Idempotenz: Migration trägt `ExecutionKey` (Hash aus Migration+Version+Tenant), doppelter Lauf = No-Op.
- Batch-Endpunkte nutzen SDK-Batch (bis 50/Request) für Bulk-Updates, Fortschritt als Envelope-meta.
- Permission: Migration erfordert `requireApiPermission('migration:run')`; fehlend → `403`, kein Teil-Write.

## Kapitel 4 – Events

- Migrationen emittieren `migration.started.v1` / `migration.completed.v1` / `migration.failed.v1` über Band-10-Outbox.
- `migration.failed.v1` triggert Rollback-Plan (deklarativ), kein eigener EventBus im Toolkit.
- `event.skipped` (Schema-Bruch im Consumer) wird auditiert; Migration pausiert bei kritischem Verification-Fail.
- Webhook-Benachrichtigung an Operatoren via HMAC-signiertem Dispatch (Band-10-Secret), kein Hardcoded Secret.
- Versionierte Events: Consumer-kompatible v1, neue Felder nur additive v2.

## Kapitel 5 – Workflows

- Komplexe Migrationen orchestrieren Phasen via Band-9/Band-11 (`migrate.plan` → `migrate.apply` → `migrate.verify`).
- `ExecutionKey` deterministisch aus Tenant+Migration+Version; Replay dedupliziert bei `409`.
- `carry migrate watch <id>` streamt `WorkflowState` (Phasen, Audit-Trail) aus Band-11.
- Fehlerpfad: `WorkflowFailed` → deklarativer Rollback, kein verlorener Datenstate.
- Keine Workflow-Engine im Toolkit – nutzt bestehende Band-9/Band-11 Runtime.

## Kapitel 6 – Agenten

- `carry migrate assist` ruft Band-11 Agent (z. B. Schema-Analyst) zur Bewertung von Breaking Changes via SDK auf.
- Agent-Context serverseitig mit Tenant-Scope; Toolkit übergibt nur Schema-Diffs, keine System-Prompts lokal.
- `ToolResult<T>` (z. B. `suggestRename`) wird als validierte Empfehlung gerendert, nicht auto-angewendet.
- Streaming-Antwort live, Abbruch via `AbortController`; Toolkit ist reiner Consumer von Band-11.
- Keine Agent-Engine im Toolkit – nur Proxy auf bestehende Runtime.

## Kapitel 7 – UI

- `carry migrate tui` bietet Terminal-Dashboard: Phasen, Fortschritt, Tenant-Isolation pro Batch.
- Web-UI (Branchen-Editionen) rendert Migrations-Status via generierte Views (Band 94) aus `MigrationManifest`.
- Keine Fachlogik in UI – Steuerung liegt in Toolkit-Services (Band-10-Standard).
- Fehler-Screens nutzen konsistente `CliError`/Envelope-Mapping; Success zeigt Audit-Link.
- Keine Secrets im Output; Operator-Token maskiert.

## Kapitel 8 – Tests

- Unit (Vitest): Manifest-Validator, Batch-Cursor-Logik, Idempotenz (doppelter Lauf = No-Op), Checkpoint-Resume.
- Integration: Migration gegen Test-DB (Prisma), Assert tenantId-Isolation pro Batch, Rollback bei Fail.
- Contract-Upgrade-Tests: vN→vN+1 Mapping deterministisch, keine Datenverluste (Roundtrip-Verifikation).
- Security-Tests: Tenant-Leak-Test (Migration ohne Scope rejected), Permission-`403` bei fehlendem Recht.
- Event-Tests: `migration.*.v1` korrekt in Outbox, HMAC-Webhook verifiziert.

## Kapitel 9 – Security

- Migration nutzt ausschließlich Band-10-Auth; Operatoren-Token nie im Toolkit-Bundle oder Log.
- Autorisierung via `requireApiPermission('migration:run')`; Tenant-Isolation durchgehend (Batch nur mit tenantId).
- Secrets/DB-Credentials nur via env/Band-10-Secret-Store; Toolkit enthält niemals Hardcoded Secrets.
- Audit für jede kritische Mutation (Row-Count, Tenant-Move) automatisch via Audit-Center.
- Generierte Pakete signiert (provenance), `npm audit` im CI; Migrations-Drift als Security-Risiko gegated.

## Kapitel 10 – Performance

- Satzweise Verarbeitung mit Batch-Größe 500–1000 Rows, p95 pro Batch < 2 s bei typischen Volumen.
- Checkpointing: Abbruch-Resume < 1 s Overhead, keine Neubearbeitung bereits migrierter Tenants.
- Parallel-Migration über Tenant-Partitionen (Worker), Gesamtlauf skaliert linear mit Mandanten.
- Indizes auf tenantId (Band 10) + Cursor-Paging verhindert Table-Scan bei Großmandanten.
- Dry-Run analysiert Row-Counts < 30 s ohne Write; Live-Run mit Backpressure bei Queue-Last.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün. 4. Unit-Tests grün.
5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Tenant-Isolation + Idempotenz-Test grün. 8. Rollback-Test grün (kein Datenverlust).

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
