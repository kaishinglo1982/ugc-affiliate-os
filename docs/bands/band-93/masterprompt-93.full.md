# CarryOS Universe – Band 93
# Masterprompt: Code Generator (VOLLSTÄNDIG)

> Band: 93 | Masterprompt: 93.0 | Status: PLANNED | Gruppe: Developer Platform
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

## Kapitel 1 – Architektur

- Der Code Generator (`@carryos/codegen`) ist ein Build-Time-Tool, das aus Band-10-API-Contracts (OpenAPI/Zod-Source) SDK-Modelle, Services und Validatoren erzeugt – er forkt keinen Core, sondern konsumiert bestehende Schemas.
- Pipeline: `Source (Prisma/Zod/OpenAPI) → IR (Intermediate Representation) → Emitter (TS/Python/Go) → Output in packages/`.
- IR ist sprachagnostisch; Emitter registrieren sich pluginartig, Branchen-Editionen können eigene Emitter beisteuern.
- Generator läuft als CLI (`carry codegen`) und als CI-Schritt; Output ist idempotent (deterministische Datei-Hashes).
- Keine Laufzeit-Logik generiert – nur Typen, Client-Wrapper, Zod-Schemas und Boilerplate, die Band-10-Standard einhalten.

## Kapitel 2 – Datenmodelle

- IR-Modell `SchemaNode` bildet Prisma-Model + Zod ab: Felder, Relationen, `tenantId`-Pflicht, Versionierung.
- Generierte Modelle erben `TenantScope`; Generator verweigert Modell ohne `tenantId` (Compile-Guard im IR-Validator).
- `Paginated<T>`-, `EventEnvelope<T>`- und `CliResult<T>`-Typen werden aus zentralen Contract-Dateien abgeleitet, nicht dupliziert.
- Diff-Modell: Generator vergleicht IR gegen bestehenden Output (`*.gen.ts`), markiert Breaking Changes (Schema-Drift).
- Versionierte Event-Payloads (`event.name.v1`) werden als discriminated unions generiert, inkl. Deprecation-Hinweis.

## Kapitel 3 – APIs

- Generator liest Band-10-OpenAPI (Version im Pfad, Envelope) und erzeugt typsichere `sdk.api.<resource>()`-Builder.
- Jeder generierte Endpoint trägt automatisch Tenant-Header-Injektion und Zod-Encode der Query/Body.
- Mutations erhalten `ExecutionKey`-Parameter-Slot; Generator embeddet Idempotenz-Helfer aus Band-10-Standard.
- Generierte Retry/Rate-Limit-Logik stammt aus SDK-Transport, wird nicht im generierten Code neu implementiert.
- Schema-Drift-Detection warnt, wenn Backend-Contract vom generierten Client abweicht (CI-Gate `codegen:check`).

## Kapitel 4 – Events

- Generator erzeugt typisierte Event-Handler-Stubs (`sdk.events.on('lead.created.v1', ...)`) aus Event-Registry.
- Payload-Typen werden aus versionierten Schemas generiert; unbekannte Event-Versionen landen in `event.skipped`.
- Generierter Code emittiert keine Events selbst, sondern ruft Band-10-Ingest auf – keine zweite EventBus-Architektur.
- Webhook-Verifikations-Helfer (HMAC) werden aus Band-10-Secret-Contract generiert, nicht hardcoded.
- Event-Replay-Buffer-Typen für Offline-First-Apps werden als Teil der SDK-Generierung ausgeliefert.

## Kapitel 5 – Workflows

- Generator erzeugt `sdk.workflow.run()`-Wrapper-Typen aus Band-9/Band-11-Workflow-Definitionen (deklarativ, nicht codiert).
- `WorkflowState`- und `WorkflowFailed`-Typen werden generiert; ExecutionKey-Helfer aus Band-10-Standard eingebunden.
- Keine Workflow-Engine im Generat – nur typsichere Aufruf-Stubs, die bestehende Runtime konsumieren.
- Generierte Long-running-Step-Typen dokumentieren Branchenprozesse als reine Datenstrukturen.
- Drift-Check: wenn Workflow-Def im Backend ändert, schlägt `codegen:check` mit Diff-Report fehl.

## Kapitel 6 – Agenten

- Generator erzeugt `sdk.agent.invoke()`-Typen aus Band-11-Rollen-Registry (RoleId als Literal-Union).
- `ToolResult<T>`-Typen werden aus Tool-Schemas generiert; Streaming-Client-Typen aus SSE-Contract.
- Keine Agent-Engine generiert – nur Consumer-Typen für bestehende Band-11 Runtime.
- Rollen-Enum wird zentral aus Band-11-Config abgeleitet, Branchen-Rollen via Plugin-Erweiterung ergänzt.
- System-Prompts bleiben serverseitig; Generator darf keine Prompt-Inhalte in den Output schreiben.

## Kapitel 7 – UI

- Generator erzeugt headless React-Hook-Signaturen (`useSdkQuery<T>`) und Form-Resolver aus Modell-Zod.
- Generierte Prop-Typen ermöglichen autocompletion-sichere Komponenten-Contracts für Branchen-Editionen.
- Storybook-Fixtures werden aus Modellen generiert; keine UI-Fachlogik im generierten Code.
- `SdkProvider`-Typen und Error-Boundary-Contracts werden aus Envelope-Schema abgeleitet.
- Generierte Komponenten-Stubs sind Platzhalter, die App-Layer mit Fachlogik füllt (Trennung gewahrt).

## Kapitel 8 – Tests

- Unit (Vitest): IR-Parser, Emitter-Roundtrip (Input→Output→re-parse), Determinismus (gleiche Hash bei gleichem Input).
- Contract-Tests: generierter Client gegen Band-10-Mock, Assert Envelope- und tenantId-Verhalten.
- Schema-Drift-Test: künstlich geändertes Backend-Schema muss `codegen:check` fehlschlagen lassen.
- Security-Tests: generierter Code enthält keine Secrets/Prompts; Tenant-Modelle ohne tenantId werden rejected.
- Snapshot-Tests: generierte Dateien haben stabile Snapshots; unerwartete Diffs brechen den CI-Gate.

## Kapitel 9 – Security

- Generator liest Contracts aus vertrauenswürdigen Repo-Quellen (kein Remote-Fetch ohne Signatur), keine Code-Injection aus Schemas.
- Generierter Code nutzt ausschließlich Band-10-Auth/Token-Store; keine eigene Secret-Verarbeitung.
- Tenant-Isolation: Generator erzwingt `tenantId` in jedem Modell/Query – Verstoß → Generierungsfehler.
- Keine Secrets/Prompts im Output; Webhook-HMAC-Helfer referenzieren env-basierte Secrets, nie Hardcoded.
- Generierte Pakete werden signiert (provenance); `npm audit` im CI gegen Supply-Chain-Risiken.

## Kapitel 10 – Performance

- IR-Build cached pro Datei; inkrementeller Lauf < 5 s für typische Band-Schemas (Watch-Mode in Dev).
- Emitters schreiben nur bei tatsächlichem Hash-Change → keine unnötigen Rebuilds, CI-Diff minimal.
- Multi-Emitter-Parallelisierung (TS/Py/Go) über Worker-Pool, Gesamtlauf < 30 s für volle Universe-Contracts.
- Generierte Bundles sind tree-shakeable (eigene Entry-Points je Band), Core-Client < 30 KB gzip.
- Memory-Cap für IR-Graph < 256 MB auch bei 1000+ Modelle; Streaming-Emit vermeidet volle In-Memory-Outputs.

## Quality Gates

1. TypeScript Strict, keine `any` (generiert). 2. Lint grün. 3. Typecheck grün (generierter Code).
4. Unit-Tests grün. 5. Contract-Tests grün. 6. Architekturtests: keine zweiten Engines.
7. `codegen:check` grün (kein uncommitted Drift). 8. Determinismus-Gate (stabile Hashes).

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
