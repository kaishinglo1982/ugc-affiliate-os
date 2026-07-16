# CarryOS Universe – Band 100
# Masterprompt: CarryOS Universe Complete (VOLLSTÄNDIG)

> Band: 100 | Masterprompt: 100.0 | Status: PLANNED | Gruppe: Developer Platform
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork; Aggregiert Bänder 91–99

## Kapitel 1 – Architektur

- Band 100 ist der Abschlussband der Developer Platform: er integriert SDK (91), CLI (92), Code/UI/API-Generatoren (93–95), Testing (96), Docs (97), Migration (98) und Release (99) zu einer kohärenten, versionierten Toolchain über CarryOS Core.
- Zentrale `UniverseToolchain` orchestriert alle Pakete als Workspace-Monorepo (`packages/*`), geteilt über VersionGraph (Band 99), kein Core-Fork.
- Einheitliche `CoreClient`-Basis (Band 91) wird von CLI/Generatoren/Testing/Docs/Migration/Release konsumiert – keine parallelen Transporte/Runtimes.
- `UniverseRegistry` verzeichnet alle Bänder 10–100 als Module mit Abhängigkeiten, Tenant-Scope und Audit-Pflicht.
- Abschluss-Validierung: kein Band darf zweite Engine/Runtime/Queue/Finance einführen (Architektur-Regel final geprüft).

## Kapitel 2 – Datenmodelle

- `UniverseManifest` aggregiert `ReleaseManifest` (99) + `MigrationManifest` (98) + `ApiDocNode` (97) + `SchemaNode` (93).
- `ToolchainNode` modelliert Paket, Band, Version, tenantScoped-Flag, abhängige Bänder, Gate-Status.
- `ContractSnapshot` friert Band-10-Contracts pro Universe-Version ein (Source für Generatoren + Docs + Tests).
- `TenantUniverseView` bildet pro Mandant aktive Band-Versionen + Permission-Scopes (Isolation durchgehend).
- `AuditUniverse` fasst Audit-Events aller Bänder 91–100 zusammen, versioniert und tenant-isoliert.

## Kapitel 3 – APIs

- `carry universe status|verify|bootstrap` bietet Gesamt-Health über alle Bänder, Antwort im Band-10-Envelope.
- Jede Toolchain-Aktion nutzt SDK-Batch (bis 50/Request) für parallele Band-Operationen, Fortschritt als meta.
- Idempotenz: Universe-Aktionen tragen `ExecutionKey` (Hash aus Aktion+Version+Tenant), Replay = No-Op.
- Permission: `requireApiPermission('universe:admin')`; fehlend → `403`, kein partieller Systemzugriff.
- Contract-Drift-Check über alle Bänder 91–99 gegen Band-10-Standard (`universe:check`) blockt bei Mismatch.

## Kapitel 4 – Events

- Universe emittiert `universe.bootstrap.v1` / `universe.verified.v1` / `universe.drift.v1` über Band-10-Outbox.
- `universe.drift.v1` meldet Contract-Abweichung eines Bandes, triggert deklarativen Repair-Plan (Generator-Run).
- `event.skipped` (Schema-Bruch) wird universe-weit auditiert; kritischer Drift pausiert betroffenes Band.
- Webhook-Benachrichtigung an Plattform-Operatoren via HMAC (Band-10-Secret), kein Hardcoded Secret.
- Versionierte Events: Consumer-kompatible v1, neue Felder nur additive v2.

## Kapitel 5 – Workflows

- Universe orchestriert End-to-End: `bootstrap` → `generate` → `test` → `doc` → `migrate` → `release` → `verify` via Band-9/Band-11.
- `ExecutionKey` deterministisch aus Aktion+Version; Replay dedupliziert bei `409` across alle Bänder.
- `carry universe watch <id>` streamt aggregierten `WorkflowState` (Phasen aller Bänder, Audit-Trail).
- Fehlerpfad: `WorkflowFailed` in einem Band → deklarativer Rollback des Gesamt-Releases, kein verlorener State.
- Keine Workflow-Engine in Band 100 – nutzt bestehende Band-9/Band-11 Runtime als einzige Quelle.

## Kapitel 6 – Agenten

- `carry universe assist` ruft Band-11 Agent (Universe-Architect) zur Gesamt-Integritätsbewertung via SDK auf.
- Agent-Context serverseitig mit Tenant-Scope; Tool übergibt nur `UniverseManifest`-Diff, keine Prompts lokal.
- `ToolResult<T>` (z. B. `suggestBandUpgrade`) als validierte Empfehlung, nicht auto-angewendet.
- Streaming live, Abbruch via `AbortController`; Band 100 ist reiner Consumer von Band-11.
- Keine Agent-Engine in Band 100 – nur Proxy auf bestehende Runtime.

## Kapitel 7 – UI

- Universe-Console (Branchen-Editionen) rendert `UniverseManifest`/`DeployState`/`AuditUniverse` via generierte Views (94).
- TUI (`carry universe tui`) zeigt Band-Status, Gate-Health, Tenant-Isolation, Drift-Warnungen.
- Keine Fachlogik in UI – Steuerung liegt in Universe-Services (Band-10-Standard).
- Fehler-Screens nutzen konsistente Envelope-Mapping; Success zeigt Changelog-, Audit- und Doc-Links.
- Keine Secrets im Output; Operator-Token maskiert.

## Kapitel 8 – Tests

- Unit (Vitest): UniverseManifest-Aggregation, VersionGraph-Auflösung, Idempotenz, Drift-Detector.
- Integration: End-to-End-Bootstrap gegen Test-Tenant, Assert alle Bänder 91–99 grün, Tenant-Isolation gewahrt.
- Contract-Tests: `universe:check` gegen Band-93-Client + Band-95-Routes + Band-97-Docs, Drift = Block.
- Security-Tests: Tenant-Leak (Universe ohne Scope rejected), Permission-`403`, Architektur-Regel "keine zweiten Engines".
- Event-Tests: `universe.*.v1` korrekt in Outbox, HMAC-Webhook verifiziert, Repair-Plan bei Drift.

## Kapitel 9 – Security

- Universe nutzt ausschließlich Band-10-Auth; Operator-Token nie im Bundle oder Log.
- Autorisierung via `requireApiPermission('universe:*')`; Tenant-Isolation durchgehend (jedes Band gescoped).
- Secrets/Signing-Keys nur via env/Band-10-Secret-Store; Toolkit enthält niemals Hardcoded Secrets.
- Audit für jeden Universe-Schritt automatisch via Audit-Center (wer/wann/welches Band/welcher Tenant).
- Alle Artefakte signiert (provenance/Cosign) + `npm audit`; Unsigned oder driftende Bänder blocken Release.

## Kapitel 10 – Performance

- `universe:check` parallelisiert über alle Bänder 91–99, p95 Gesamt-Validierung < 15 min für volle Universe.
- VersionGraph + ContractSnapshot gecached, Bootstrap-Plan < 10 s bei 100+ Paketen.
- Parallele Generator/Test/Doc-Runs über Worker-Pool, skaliert linear mit Band-Anzahl.
- Promotion-Ring-Rollout (Canary→Beta→Stable) über Band 99, Backpressure bei Fehler-Rate > 1%.
- Resume bei Abbruch < 2 s Overhead; kein Re-Run bereits verifizierter Bänder.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün. 4. Unit-Tests grün.
5. Integration/E2E-Tests grün. 6. Architekturtests: keine zweiten Engines/Runtimes (final).
7. Tenant-Isolation + Idempotenz-Test grün. 8. `universe:check` grün (kein Drift) + Signing-Gate grün.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
