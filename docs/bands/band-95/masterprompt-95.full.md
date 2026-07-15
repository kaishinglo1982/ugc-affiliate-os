# CarryOS Universe – Band 95
# Masterprompt: API Generator (VOLLSTÄNDIG)

> Band: 95 | Masterprompt: 95.0 | Status: PLANNED | Gruppe: Developer Platform
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

## Kapitel 1 – Architektur

- Der API Generator (`@carryos/apigen`) erzeugt aus Domänen-Definitionen (Prisma-Modell + Service-Spec) vollständige Band-10-konforme Endpunkte – er nutzt bestehende `withApiContext`, Repository- und Service-Layer, forkt keinen Core.
- Pipeline: `Domain-Spec → Route-IR → Emitter (Next.js Route Handler + Zod Contract + OpenAPI) → src/app/api/vN`.
- Route-IR beschreibt Resource, CRUD-Verben, Permission-Scopes, Idempotenz und Event-Emit deklarativ.
- Generator ist Build-Time, idempotent (stabile Hashes), als `carry apigen` und CI-Schritt (`apigen:check`).
- Generierte Handler enthalten KEINE Fachlogik – sie delegieren an vorhandene Service-Methoden (Architektur-Regel).

## Kapitel 2 – Datenmodelle

- Generierte Contracts leiten Zod-Schemas aus Prisma ab; jedes Schema trägt zwingend `tenantId`.
- `Paginated<T>`-, `Envelope<T>`- und `EventEnvelope<T>`-Typen werden aus zentralen Contract-Dateien referenziert.
- Route-IR-Modell `ResourceSpec` erfasst Felder, Relationen, Unique-Keys, Soft-Delete, Audit-Flag.
- Versionierung: generierte Pfade tragen `/api/vN/`, Breaking Changes erzeugen neue Version (nie mutable im Place).
- Event-Payloads (`event.name.v1`) werden als versionierte Zod-Schemas generiert, inkl. Deprecation-Marker.

## Kapitel 3 – APIs

- Generierte Endpunkte folgen Band-10-Standard: Envelope `{ ok, data, error, meta }`, Version im Pfad.
- Jeder Handler wrapt Aufruf in `withApiContext`, injiziert Tenant-Scope, validiert Input per Zod.
- Mutations emitten versionierte Events über bestehende Outbox; `ExecutionKey`-Header für Idempotenz aus Band-10.
- Autorisierung via `requireApiPermission(scope)`; fehlende Rechte → `403`, niemals Datenleak.
- OpenAPI-Spec wird mitgeneriert (Source für Band 93 Code Generator), Drift-Check gegen bestehende Routes.

## Kapitel 4 – Events

- Generierte Mutations rufen Band-10-Event-Ingest auf (kein eigener EventBus); Event-Namen `resource.action.v1`.
- Outbox-Pattern: Event wird transaktional mit DB-Write persistiert, von Queue konsumiert (Band 5/10).
- `event.skipped` bei Schema-Bruch im Consumer wird auditiert, nicht silently verworfen.
- Generierte Webhook-Dispatcher nutzen HMAC-Signatur (Band-10-Secret), kein Hardcoded Secret.
- Versionierte Events: Consumer-kompatible v1 bleibt, neue Felder nur additive v2.

## Kapitel 5 – Workflows

- Generierte Ressourcen können Workflow-Trigger deklarieren, die Band-9/Band-11-Prozesse über SDK starten.
- `ExecutionKey` für Workflow-Aufrufe deterministisch aus Tenant+Intent+Payload; `409` dedupliziert.
- Keine Workflow-Engine generiert – nur Typp-Stubs, die bestehende Runtime konsumieren.
- Generierte Status-Endpunkte (`GET /resource/:id/workflow`) lesen `WorkflowState` aus Band-11.
- Long-running Branchenprozesse als deklarative Trigger-Konfig, nicht als codierte Logik.

## Kapitel 6 – Agenten

- Generierte Ressourcen können Agent-Tools als deklarative Tool-Specs für Band-11 exponieren (kein eigener Agent).
- Tool-Schemas werden als Zod generiert und in Band-11-Runtime registriert; System-Prompts serverseitig.
- `ToolResult<T>`-Typen aus generierten Schemas; Streaming über SSE-Contract des SDK.
- Generator schreibt keine Prompt-Inhalte; nur Tool-Referenz-IDs und typsichere Wrapper.
- Rollen-Enum (Band 93) steuert, welche Agenten Tools nutzen dürfen – Permission-Scopes aus Band-10.

## Kapitel 7 – UI

- Generierte OpenAPI/Schemas speisen Band 94 UI Generator → automatische Listen/Detail/Form-Views.
- Keine UI-Fachlogik in generierten Routes; Darstellung liegt in generierten UI-Komponenten.
- `SdkProvider`/Envelope-Fehler-Mapping erfolgt UI-seitig; Backend liefert nur standardisierten Envelope.
- Branchen-Editionen ergänzen generierte Basis-Routes um fachspezifische Services, nicht um Forks.
- Generierte Routes loggen Audits für kritische Mutations (Band 10 Audit-Center kompatibel).

## Kapitel 8 – Tests

- Unit (Vitest): Route-IR-Parser, Zod-Contract-Generierung, Determinismus (stabile Hashes).
- Integration: generierte Route gegen Test-DB, Assert Envelope, tenantId-Filter, Permission-`403`.
- Contract-Tests: OpenAPI-Drift zwischen generiertem Client (Band 93) und Route – `apigen:check` fehlschlägt bei Diff.
- Security-Tests: Tenant-Leak-Test (Query ohne tenantId rejected), Idempotenz (`409` bei doppeltem Key).
- Event-Tests: Mutation emittiert korrektes `event.name.v1` in Outbox, HMAC-Webhook verifiziert.

## Kapitel 9 – Security

- Generierte Routes nutzen ausschließlich Band-10-Auth (`withApiContext`), keine zweite Authentifizierung.
- Autorisierung via `requireApiPermission`; Tenant-Isolation durchgehend erzwungen (Query ohne tenantId → reject).
- Secrets/API-Keys nur via env/Band-10-Secret-Store; generierter Code enthält niemals Hardcoded Secrets.
- Audit für kritische Mutations automatisch generiert (Audit-Center kompatibel), keine Logs mit sensiblen Daten.
- Generierte Pakete signiert (provenance), `npm audit` im CI; Route-Drift wird als Security-Risiko gegated.

## Kapitel 10 – Performance

- Generierte Routes nutzen bestehende Indizes auf `tenantId`; Query-Pläne p95 < 80 ms bei typischen Volumen.
- Async-Event-Emit via Outbox/Queue, Handler antworten vor Event-Verarbeitung (Fire-and-Envelope).
- Caching: Envelope-meta für Listen mit Cursor, Conditional-Request (ETag) aus SDK/Cache-Layer.
- Batch-Endpunkte (`POST /resource/batch`) generierbar für Bulk-Imports, bis 50 Items/Request.
- Generierungslauf inkrementell < 6 s; nur geänderte Routes neu emittiert, CI-Diff minimal.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün. 4. Unit-Tests grün.
5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines/Routes-Fork.
7. `apigen:check` grün (kein Drift). 8. Tenant-Isolation + Idempotenz-Test grün.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
