# CarryOS Universe – Band 99
# Masterprompt: Release Management (VOLLSTÄNDIG)

> Band: 99 | Masterprompt: 99.0 | Status: PLANNED | Gruppe: Developer Platform
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

## Kapitel 1 – Architektur

- Release Management (`@carryos/release`) ist eine Orchestrierungsschicht für versionierte Releases über alle Universe-Pakete (SDK, CLI, Generatoren, Branchen-Editionen), die bestehende CI/CD und Band-10-Standard nutzt – kein Core-Fork.
- Bestandteile: `VersionGraph` (Abhängigkeiten Bände 10–98), `ReleasePlanner`, `ChangelogGen`, `DeployOrchestrator`, `GateRunner`.
- Releases sind versioniert und atomar pro Tenant-Ring (canary→beta→stable), gesteuert via Band-9/Band-11-Workflows.
- Alle Release-Artefakte signiert (npm provenance / Cosign), Supply-Chain-Prüfung obligatorisch.
- Keine eigene Deploy-Engine – nutzt bestehende Pipeline + Band-10-Services; Audit jedes Release-Schritts.

## Kapitel 2 – Datenmodelle

- `ReleaseManifest` trägt `{ id, version, bands[], packages[], gates[], tenantRing }`, validiert per Zod.
- `VersionNode` im `VersionGraph` erfasst Paket, abhängige Bände, Breaking-Flag, Compatibility-Window.
- `GateResult` modelliert Quality-Gate-Status (lint/typecheck/test/arch) pro Paket, typsicher.
- `ChangelogEntry` leitet aus Conventional-Commits + Band-Zuordnung ab, versioniert und tenant-sichtbar.
- `DeployState` erfasst Ring-Fortschritt (canary%, beta%, stable%), Rollback-Trigger-Bedingung.

## Kapitel 3 – APIs

- `carry release plan|cut|promote|rollback` mappt auf Release-Services; Status via Band-10-Envelope.
- Release-Trigger nutzen SDK-Batch für parallele Paket-Publish, Fortschritt als Envelope-meta.
- Idempotenz: Release trägt `ExecutionKey` (Hash aus Version+Ring), doppelter Cut = No-Op/Resume.
- Permission: `requireApiPermission('release:cut')`; fehlend → `403`, kein partieller Publish.
- Gate-Ergebnisse werden über Band-10-Endpunkte gelesen; Drift zwischen Plan und Gate = Block.

## Kapitel 4 – Events

- Release emittiert `release.cut.v1` / `release.promoted.v1` / `release.rolledback.v1` über Band-10-Outbox.
- `release.failed.v1` triggert deklarativen Rollback-Plan, kein eigener EventBus im Toolkit.
- `event.skipped` (Schema-Bruch im Consumer) auditiert; Release pausiert bei kritischem Gate-Fail.
- Webhook-Benachrichtigung an Teams via HMAC-signiertem Dispatch (Band-10-Secret), kein Hardcoded Secret.
- Versionierte Events: Consumer-kompatible v1, neue Felder nur additive v2.

## Kapitel 5 – Workflows

- Release orchestriert Phasen via Band-9/Band-11: `plan` → `gate` → `cut` → `promote` → `verify` → `stable`.
- `ExecutionKey` deterministisch aus Version+Ring; Replay dedupliziert bei `409`.
- `carry release watch <id>` streamt `WorkflowState` (Phasen, Audit-Trail) aus Band-11.
- Fehlerpfad: `WorkflowFailed` → automatischer Rollback zum letzten stable Ring, kein verlorener State.
- Keine Workflow-Engine im Release-Toolkit – nutzt bestehende Band-9/Band-11 Runtime.

## Kapitel 6 – Agenten

- `carry release assist` ruft Band-11 Agent (Release-Strategist) zur Risikobewertung von Breaking Changes via SDK auf.
- Agent-Context serverseitig mit Tenant-Scope; Toolkit übergibt nur VersionGraph-Diff, keine Prompts lokal.
- `ToolResult<T>` (z. B. `suggestRollbackWindow`) als validierte Empfehlung, nicht auto-angewendet.
- Streaming live, Abbruch via `AbortController`; Toolkit ist reiner Consumer von Band-11.
- Keine Agent-Engine im Toolkit – nur Proxy auf bestehende Runtime.

## Kapitel 7 – UI

- Release-Dashboard (Branchen-Editionen) rendert `ReleaseManifest`/`DeployState` via generierte Views (Band 94).
- TUI (`carry release tui`) zeigt Gate-Status, Ring-Fortschritt, Tenant-Isolation pro Deployment.
- Keine Fachlogik in UI – Steuerung liegt in Release-Services (Band-10-Standard).
- Fehler-Screens nutzen konsistente Envelope-Mapping; Success zeigt Changelog- und Audit-Link.
- Keine Secrets im Output; Deploy-Token maskiert.

## Kapitel 8 – Tests

- Unit (Vitest): VersionGraph-Auflösung, ChangelogGen aus Commits, Idempotenz (doppelter Cut = No-Op), Gate-Resolver.
- Integration: Release gegen Test-Tenant-Ring, Assert Promotion-Reihenfolge canary→beta→stable, Rollback bei Fail.
- Contract-Tests: `ReleaseManifest` gegen Band-93-Client, Drift → Block (`release:check`).
- Security-Tests: Tenant-Leak (Release ohne Scope rejected), Permission-`403` bei fehlendem Recht.
- Event-Tests: `release.*.v1` korrekt in Outbox, HMAC-Webhook verifiziert.

## Kapitel 9 – Security

- Release nutzt ausschließlich Band-10-Auth; Deploy-Token nie im Bundle oder Log.
- Autorisierung via `requireApiPermission('release:*')`; Tenant-Isolation durchgehend (Ring-Scoping).
- Secrets/Signing-Keys nur via env/Band-10-Secret-Store; Toolkit enthält niemals Hardcoded Secrets.
- Audit für jeden Release-Schritt automatisch via Audit-Center (wer/wann/welcher Ring).
- Artefakt-Signing (provenance/Cosign) + `npm audit` im CI; Unsigned-Pakete blocken Release.

## Kapitel 10 – Performance

- VersionGraph-Auflösung cached, Plan-Berechnung < 5 s auch bei 100+ Paketen (Bänder 10–98).
- Parallele Gate-Ausführung über Worker, p95 Full-Suite-Gate < 10 min für Universe-Release.
- Promotion-Ring-Rollout gestaffelt (Canary 1%→Beta 10%→Stable), Backpressure bei Fehler-Rate > 1%.
- Signing paralleler Artefakte über Worker-Pool, Publish-Batch via SDK (bis 50/Request).
- Resume bei Abbruch < 2 s Overhead; kein Re-Publish bereits freigegebener Pakete.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün. 4. Unit-Tests grün.
5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Tenant-Isolation + Idempotenz-Test grün. 8. Signing/Supply-Chain-Gate (provenance) grün.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
