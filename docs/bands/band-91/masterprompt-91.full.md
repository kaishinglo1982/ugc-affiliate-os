# CarryOS Universe – Band 91
# Masterprompt: Developer SDK (VOLLSTÄNDIG)

> Band: 91 | Masterprompt: 91.0 | Status: PLANNED | Gruppe: Developer Platform
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

## Kapitel 1 – Architektur

- Das Developer SDK ist ein typsicherer Client-Layer über der Band-10-API (Envelope, withApiContext, Zod-Schemas) – es dupliziert keine Runtime, sondern bindet an `src/lib/api` und `src/lib/repository` an.
- SDK ist mehrsprachig geplant (TypeScript/Node als First-Class, danach Python/Go-Stubs generiert), alle Pakete alsWorkspace-Pakete unter `packages/sdk/` mit semantischer Versionierung.
- Klar getrennte Layer: Transport (Fetch/Retry/Rate-Limit), Auth (Token-Refresh via Band 10 Session), Models (generierte Zod→TS-Typen), Services (fachspezifische Helper je Band), Tenant-Context (tenantId-Weitergabe).
- Plugin-/Branchenerweiterungen registrieren sich über ein `registerModule()`-Interface, das Schemas und Service-Module injiziert, ohne den Core zu forken.
- SDK ist server- und client-fähig; serverseitige Aufrufe nutzen `withApiContext`, clientseitige nutzen das öffentliche Gateway mit gesichertem Token.

## Kapitel 2 – Datenmodelle

- Generierte Modelle spiegeln Prisma-Schemas wider; jedes Modell enthält zwingend `tenantId` und wird durch Zod-Schema mit Tenant-Filter validiert.
- SDK liefert `Model<T>`-Typen plus discriminated unions für versionierte API-Events (`event.name.v1`).
- Ein `Paginated<T>`-Envelope-Typ konsumiert die Band-10-Listenstruktur (cursor/meta), fehlerfreie Deserialisierung per Schema-Parse.
- Lokales Cache-Modell (`CacheEntry<T>` mit TTL/ETag) für leselastige Branchen-Daten, invalidiert über Event-Subskription.
- `TenantScope`-Typ erzwingt, dass keine Query ohne `tenantId` kompiliert (Compile-Time-Isolation).

## Kapitel 3 – APIs

- SDK-Endpunkte folgen strikt dem Band-10-Standard: Version im Pfad (`/api/v1/...`), einheitlicher Envelope `{ ok, data, error, meta }`.
- `sdk.api.<band>().<resource>().list(filter)`-Builder erzeugt typsichere Requests mit automatischem Zod-Encode der Query-Params.
- Mutations-API (`create/update/delete`) liefert idempotente ExecutionKey-Unterstützung via Header, Rücksprung bei `409 Conflict` dedupliziert.
- Streaming-Endpunkte (Agenten/Events) nutzen Server-Sent-Events-Client mit automatischem Reconnect und Tenant-Re-Auth.
- Rate-Limit-Handling: SDK liest `Retry-After` und `X-RateLimit-*`-Header, exponentielles Backoff mit Jitter.

## Kapitel 4 – Events

- SDK abonniert versionierte Events über bestehende Outbox/Queue (Band 5/10), Typ `EventEnvelope<TPayload>` mit `event.name.v1`.
- `sdk.events.on('lead.created.v1', handler)` registriert typsichere Handler; Schema-Bruch führt zu `event.skipped` mit Audit-Log.
- Lokaler Event-Replay-Puffer für Offline-First-Branchen-Apps mit späterer Sync gegen Outbox-Cursor.
- SDK emittiert keine eigenen Events, sondern ruft Band-10-Event-Ingest auf – keine zweite EventBus-Architektur.
- Webhook-Verifikation: SDK validiert Signaturen (HMAC über Band-10-Secret) vor Weitergabe an Consumer-Callbacks.

## Kapitel 5 – Workflows

- SDK orchestriert keine eigenen Workflows, sondern ruft Band-9/Band-11-Prozesse über `sdk.workflow.run(executionKey, input)` auf.
- Idempotenz: jeder Workflow-Aufruf erfordert `executionKey`; SDK generiert deterministischen Key aus Tenant+Intent+Payload-Hash.
- `sdk.workflow.watch(id)` pollt Status oder nutzt Event-Stream, liefert `WorkflowState` mit Phasen und Audit-Trail.
- Fehlerpfade: `WorkflowFailed`-Event wird typsicher gemappt, SDK bietet `retry()` mit neuem ExecutionKey-Variant.
- Long-running Branchenprozesse (Angebot→Auftrag) werden als deklarative Steps konfiguriert, nicht im SDK codiert.

## Kapitel 6 – Agenten

- SDK stellt `sdk.agent.invoke(roleId, prompt, context)` als dünnen Proxy auf Band-11 Agent Runtime – keine eigene Agent-Engine.
- Agent-Context wird serverseitig mit Tenant-Scope angereichert; SDK darf keine System-Prompts clientseitig halten.
- Tool-Calling-Resultate werden als validierte Payloads zurückgegeben (`ToolResult<T>` mit Schema-Check).
- Streaming von Agent-Antworten via SSE-Client, Abbruch via `AbortController` mit Tenant-Re-Auth.
- Agent-Registrierung neuer Rollen erfolgt über Band-11-Config, SDK nur Consumer – keine zweite Agent Runtime.

## Kapitel 7 – UI

- SDK liefert headless React-Hooks (`useSdkQuery`, `useSdkMutation`) ohne UI-Fachlogik; Komponenten bleiben in App-Layer.
- Generierte UI-Typen (Props aus Models) ermöglichen autocompletion-sichere Forms mit Zod-Resolver.
- `SdkProvider` injiziert Tenant-Context und Base-URL, Error-Boundary mappt Envelope-Fehler auf UI-States.
- Keine Geschäftslogik in Client-Komponenten – alle Mutations-Rules liegen in Band-10-Services.
- Storybook-Fixtures aus SDK-Modellen generiert, um Branch-Editionen konsistente Komponenten-Contracts zu geben.

## Kapitel 8 – Tests

- Unit (Vitest): Schema-Parse-Roundtrips, Builder-Typensicherheit, Retry/Backoff-Logik mit Fake-Timer.
- Integration: SDK gegen Band-10-Test-API (Mock-Server mit Envelope), Tenant-Isolation pro Test isoliert via `tenantId`.
- Contract-Tests: OpenAPI/Zod-Schema-Drift-Detection zwischen SDK und Backend-Schemas.
- Security-Tests: Tenant-Leak-Test (Query ohne tenantId wird rejected), Token-Refresh-Edge-Cases.
- Fuzz-Tests: Event-Payloads mit zufälligen Schemas dürfen nie den Consumer crashen (→ `event.skipped`).

## Kapitel 9 – Security

- Authentifizierung ausschließlich über Band-10-Session/Token-Refresh – keine zweite Auth-Implementierung im SDK.
- Autorisierung: SDK fordert `requireApiPermission`-Scopes an; fehlende Rechte führen zu `403` Envelope, nie zu Silent-Fail.
- Tenant-Isolation: `tenantId` wird an jedem Request angehängt; SDK verweigert Requests ohne Scope (Compile- und Runtime-Check).
- Secrets (API-Keys, Webhook-Secrets) niemals im SDK-Bundle, nur in `process.env`/Secure-Storage; kein Log von Tokens.
- SDK-Versionen signieren Releases (npm provenance), Supply-Chain-Prüfung via `npm audit` im CI-Gate.

## Kapitel 10 – Performance

- Tree-Shaking: jedes Band-Modul ist eigener Entry-Point, Core-Bundle < 30 KB gzip; schwere Branchenmodule lazy.
- Connection-Pooling und HTTP/2-Keepalive über zentrale Transport-Instanz, p95-Latenz Gateway < 120 ms.
- Local Cache mit ETag/Conditional-Request reduziert Repeat-Reads um Ziel > 60 %, invalidiert via Event-Sub.
- Batch-API (`sdk.api.batch([...])`) bündelt bis zu 50 Requests, senkt Roundtrips für Bulk-Branchenimporte.
- Indizes auf tenantId serverseitig (Band 10) + SDK-seitiges Cursor-Paging verhindert Overscan bei Großmandanten.

## Quality Gates

1. TypeScript Strict, keine `any` (SDK-Models generiert). 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün (Vitest). 5. Integration/Contract-Tests grün. 6. Architekturtests: keine zweiten Engines/Runtimes.
7. Tenant-Isolation-Test grün. 8. Bundle-Size-Gate (< 30 KB core gzip) eingehalten.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
