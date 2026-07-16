# CarryOS Universe – Band 96
# Masterprompt: Testing Framework (VOLLSTÄNDIG)

> Band: 96 | Masterprompt: 96.0 | Status: PLANNED | Gruppe: Developer Platform
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

## Kapitel 1 – Architektur

- Das CarryOS Testing Framework (`@carryos/testkit`) ist eine Test-Harness-Schicht über Vitest/Jest, die Band-10-Standard (Envelope, Tenant-Context, Zod) als Test-Primitive bereitstellt – keine eigene Test-Runtime, Integration in bestehende Toolchain.
- Bestandteile: `TenantTestContext` (isoliertes tenantId pro Test), `ApiContractHarness` (Envelope-Assert), `EventHarness` (Outbox-Assert), `SdkMock` (generierter Client-Mock).
- Fixtures werden aus Band-93-generierten Modellen abgeleitet, sodass Tests immer gegen aktuelle Contracts laufen (Drift-Erkennung).
- Framework ist deklarativ: Test-Autoren beschreiben `given(resource).when(action).expect(envelope/event)`, Harness führt gegen echte Services aus.
- Keine Duplikate zu Band-10-Logik – Tests üben bestehende Repository/Service-Layer aus, forken nichts.

## Kapitel 2 – Datenmodelle

- `TenantTestContext` trägt `{ tenantId, workspaceId, role, permissions[] }`, isolation per Test-Transaction/Rollback.
- `ContractFixture<T>` wird aus generiertem Zod-Schema gebaut; `Factory.build()` erzeugt valide Modelle inkl. `tenantId`.
- `EventAssertion` modelliert erwartete Outbox-Einträge (`event.name.v1` + payload-Hash), typisiert.
- `ApiExpectation` erfasst Envelope-Struktur, HTTP-Status, Permission-`403`-Fall und Idempotenz-`409`.
- `SdkMockSpec` hält aufgezeichnete Calls (tenantId, endpoint, payload) für Consumer-Tests ohne echtes Netz.

## Kapitel 3 – APIs

- `ApiContractHarness` startet Band-10-Routes gegen Test-DB und Asserted Envelope `{ ok, data, error, meta }`.
- Tenant-Isolation-Test-Primitive: `expectTenantIsolation(() => sdk.lead.list())` prüft, dass Query `tenantId` erzwingt.
- Idempotenz-Primitive: `expectIdempotent(mutation, key)` sendet doppelt, Assert `409` + einmaliger Write.
- Permission-Primitive: `expectForbidden(scope)` ruft ohne Recht, Assert `403` ohne Datenleak.
- Drift-Check: Harness vergleicht laufende Route-Contracts mit Band-93-Client, Warnung bei Mismatch.

## Kapitel 4 – Events

- `EventHarness` liest Band-10-Outbox und Asserted `event.name.v1` + versionierten Payload gegen Zod.
- Test primitiv `expectEvent('lead.created.v1', {tenantId})` wartet asynchron auf Outbox-Eintrag (Timeout).
- `event.skipped`-Pfad testbar: korrupte Payload muss auditiert statt gecrasht werden (Resilience-Test).
- Webhook-Test: `expectWebhook(signature)` verifiziert HMAC über Band-10-Secret, kein Hardcoded Secret im Test.
- Kein eigener EventBus im Framework – es konsumiert bestehende Outbox/Queue (Band 5/10).

## Kapitel 5 – Workflows

- `WorkflowHarness` startet Band-9/Band-11-Prozesse via SDK und Asserted `WorkflowState`/Phasen/Audit-Trail.
- Idempotenz: `expectWorkflowIdempotent(def, input)` mit ExecutionKey, Assert einmaliger Lauf bei Replay.
- Fehlerpfad: `expectWorkflowFailed(def)` Asserted `WorkflowFailed`-Event + Retry-Hinweis, kein verlorener State.
- Long-running Tests nutzen Fake-Timer/Worker, um Phasenübergänge deterministisch zu prüfen.
- Keine Workflow-Engine im Framework – nur Ausführung gegen bestehende Runtime.

## Kapitel 6 – Agenten

- `AgentHarness` ruft Band-11 Agent Runtime über SDK auf und Asserted `ToolResult<T>` gegen Schema.
- RoleId-Enum (Band 93) steuert verfügbare Test-Rollen; System-Prompts bleiben serverseitig (nie im Test-Bundle).
- Streaming-Test: `expectAgentStream(role, prompt)` Asserted Chunk-Reihenfolge + sauberer `AbortController`-Abbruch.
- `expectToolCall(toolId, args)` Asserted typsichere Tool-Argumente und validiertes Resultat.
- Keine Agent-Engine im Framework – nur Consumer-Tests gegen Band-11 Runtime.

## Kapitel 7 – UI

- `UiHarness` kombiniert Testing-Library mit `SdkMock`, rendert generierte Komponenten (Band 94) ohne echtes Netz.
- Tenant-Scope-Test: generierte View darf ohne tenantId keine Daten anfordern (Mock verweigert).
- Envelope-Fehler-State-Test: `403`/`409` mappen auf sichtbare UI-States, kein Silent-Fail im DOM.
- a11y-Test-Primitive: `expectAccessible(form)` prüft Label/ARIA via axe (WCAG AA), automatisch im CI.
- Keine UI-Fachlogik getestet – nur Contracts der generierten Komponenten (Consumer-Sicht).

## Kapitel 8 – Tests

- Framework-Selbsttests (Meta): Unit für Harness-Primitive (TenantContext, EventHarness, ApiContract) mit Fake-DB.
- Beispiel-Suite gegen Band-10-Module als Reference-Implementation (Lead/Workflow/Agent) als Golden-Master.
- Determinismus: Fixtures mit Seed, gleiche Test-Runs reproduzierbar; Snapshot-Stability-Gate.
- Coverage-Gate: kritische Pfade (Tenant-Isolation, Idempotenz, Permission) > 95 % Abdeckung.
- Architektur-Test: Framework darf keine zweite Test-Runtime/Engine einführen (nutzt Vitest).

## Kapitel 9 – Security

- Test-Harness nutzt isolierte Test-Tenants, niemals Produktionsdaten oder echte Secrets.
- Secrets in Tests nur via env/Test-Vault; niemals Hardcoded, niemals in Logs/Reports.
- Tenant-Isolation ist erstklassiges Security-Primitive – Leak-Test schlägt Suite bei Verstoß fehl.
- Permission-Tests Asserten explizit `403` ohne Datenrückgabe (verhindert Over-Permission-Bugs).
- Framework-Report enthält keine sensiblen Payloads; Maskierung in CI-Logs aktiv.

## Kapitel 10 – Performance

- `TenantTestContext` nutzt Transaction-Rollback statt Truncate → Setup < 50 ms pro Test, Suite < 2 min (1000 Tests).
- `SdkMock` vermeidet Netz-Overhead, Consumer-Tests < 10 ms je Case; echt Integration nur wo nötig.
- Parallele Worker (Vitest) über Tenant-Partitionen, p95-Suite-Lauf < 5 min für volle Universe-Tests.
- EventHarness poll mit Backoff statt busy-wait, Outbox-Assert < 200 ms typisch.
- Memory-Cap < 512 MB für volle Suite; Fixtures werden gestreamt, nicht voll materialisiert.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün. 4. Framework-Unit-Tests grün.
5. Reference-Suite grün. 6. Architekturtests: keine zweiten Engines/Runtimes.
7. Tenant-Isolation/Idempotenz-Primitive grün. 8. Coverage-Gate (> 95 % kritisch) eingehalten.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
