# CarryOS Universe – Band 63
# Masterprompt: Workflow Packs (VOLLSTÄNDIG)

> Band: 63 | Masterprompt: 63.0 | Status: PLANNED | Gruppe: Platform
> Abhängigkeit: Band 10–16 (Core), Band 9 (Workflow Foundation), keine Core-Fork

## Kapitel 1 – Architektur

- Workflow Packs bündeln vordefinierte, versionierte Workflow-Definitionen (`workflowPack`) als deklarative YAML/JSON-Specs, die in die Band-9 Workflow Engine geladen werden – keine eigene Engine.
- Pack-Loader registriert Steps, Triggers und Connections über die bestehende Workflow Runtime; Tenant-Isolation via tenantScope pro Pack-Instance.
- Packs sind komponierbar: ein Pack kann andere Packs als Dependency deklarieren (semantische Versionierung).
- Parameter-Overrides erfolgen über tenant-spezifische Config, niemals Hardcoded im Pack.

## Kapitel 2 – Datenmodelle

- `WorkflowPack`: packId, version, name, authorId, dependencies[], steps[], triggers[], requiredCapabilities[].
- `WorkflowPackInstallation`: tenantId, packId, version, config (Zod), status, installedBy.
- `WorkflowPackRun`: tenantId, packInstanceId, runId, status, startedAt, finishedAt (Aggregation über Band 9 Runs).
- `WorkflowPackDependency`: packId, dependsOnPackId, semverConstraint.

## Kapitel 3 – APIs

- `GET /api/v1/workflow-packs` – verfügbare Packs (Katalog, Public-lesbar).
- `POST /api/v1/workflow-packs/:id/install` – Instanz im Tenant anlegen (Band-10-Envelope).
- `POST /api/v1/workflow-packs/:id/run` – Pack-Workflow auslösen mit tenantConfig.
- `GET /api/v1/workflow-packs/:id/runs` – Run-History eines Tenants (tenantIsolation).

## Kapitel 4 – Events

- `workflow_pack.installed.v1`, `workflow_pack.run_started.v1`, `workflow_pack.run_completed.v1`, `workflow_pack.dependency_unmet.v1`.
- Steps emittieren bestehende Band-9 `workflow.step.*.v1` Events; Packs fügen nur Orchestrierungs-Events hinzu.
- Alle Events mit `tenantId`, `packInstanceId`, `actorId`; schema-versioniert.

## Kapitel 5 – Workflows

- Install-Flow: Dependency-Resolve (semver) → Capability-Check → Config-Validate (Zod) → Band 9 Registration → ExecutionKey → Status ACTIVE.
- Run-Flow: Trigger → Step-DAG-Ausführung in Band 9 → Parameter aus tenantConfig → Completion → Aggregation.
- Conflict-Flow: unmet Dependency → `workflow_pack.dependency_unmet.v1`, Installation blockiert, kein Partial-Deploy.

## Kapitel 6 – Agenten

- `WorkflowPackCompilerAgent` (Band 11): validiert Step-DAG, erkennt Zyklen, prüft Capability-Anforderungen.
- `PackOrchestrationAgent`: überwacht Pack-Runs, Retry bei Step-Failure, Escalation bei SLA-Verletzung.
- Tenant-Scoped Ausführung; Agenten erben keine Core-Workflow-Rechte.

## Kapitel 7 – UI

- Workflow-Pack-Katalog: Karten mit Steps-Übersicht, Dependencies, "Install"-Button.
- Pack-Konfigurator: dynamisches Formular aus Pack-Schema (Zod-driven), Live-Validation.
- Run-Monitor: DAG-Visualisierung, Step-Status, Logs, Retry-Controls pro Tenant.

## Kapitel 8 – Tests

- Vitest-Unit: semver-Dependency-Resolve, DAG-Zyklus-Erkennung, Zod-Config-Validation.
- Integration: Install→Run→Complete Roundtrip; Tenant A Runs nicht in Tenant B sichtbar.
- Security-Test: Pack fordert verbotene Capability → Install blockiert + Event.

## Kapitel 9 – Security

- Packs signiert (Ed25519), Checksum-Verifikation vor Registration in Band 9.
- requiredCapabilities via Band 10 Allowlist; Least-Privilege pro Step.
- requireApiPermission auf Install/Run; Audit aller Pack-Installationen und Runs.

## Kapitel 10 – Performance

- Dependency-Resolve < 30ms (p95) via In-Memory semver-Graph; Pack-Run-Start < 150ms.
- Run-History paginiert + cached (TTL 30s); Indizes auf (tenantId, packInstanceId).
- DAG-Parallelisierung in Band 9 nutzen, keine serielle Simulation im Pack-Layer.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweite Workflow-Engine.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
