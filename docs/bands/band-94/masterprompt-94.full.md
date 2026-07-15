# CarryOS Universe – Band 94
# Masterprompt: UI Generator (VOLLSTÄNDIG)

> Band: 94 | Masterprompt: 94.0 | Status: PLANNED | Gruppe: Developer Platform
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

## Kapitel 1 – Architektur

- Der UI Generator (`@carryos/uigen`) erzeugt aus Band-10-Contracts und Modell-Zod headless React-Komponenten, Forms und Dashboards – er nutzt bestehende `useSdkQuery`/`useSdkMutation`-Hooks (Band 91), kein eigener State-Store.
- Pipeline: `Model/Zod → Layout-IR → Component-Emitter (shadcn/Radix + Tailwind) → packages/ui/gen`.
- Layout-IR beschreibt Listen/Detail/Form/Filter-Views deklarativ; Branchen-Editionen liefern Layout-Presets als Plugin.
- Generator ist Build-Time, idempotent (deterministische Hashes), läuft als `carry uigen` und CI-Schritt.
- Keine Fachlogik in generierten Komponenten – Mutations-Rules bleiben in Band-10-Services, UI ist reiner Consumer.

## Kapitel 2 – Datenmodelle

- UI-Modelle leiten sich aus generierten SDK-Typen (Band 93): `Model<T>`, `Paginated<T>`, `FormSchema<Zod>`.
- `FilterState`, `SortState`, `PaginationState` werden als typsichere View-Modelle aus Query-Zod abgeleitet.
- Generierte Form-Resolver binden Zod-Schema direkt (kein Doppel-Mapping), Fehler-State typisiert.
- TenantScope wird an jedes View-Modell vererbt; Generator blockiert Modelle ohne `tenantId`.
- Event-Typen (`EventEnvelope<T>`) steuern Live-Updates der generierten Listen via SDK-Subscription.

## Kapitel 3 – APIs

- Generierte Views rufen ausschließlich SDK-Hooks auf, die Band-10-Endpunkte (Version im Pfad, Envelope) konsumieren.
- Listen-Views nutzen Cursor-Paging des SDK; Filter/Sort werden als validierte Query-Params an Band-10 gesendet.
- Mutations-Forms senden via `useSdkMutation` mit `ExecutionKey` (Idempotenz aus Band-10-Standard).
- Generierte Komponenten behandeln `409 Conflict` als Dedupe-Hinweis, `403` als Permission-State (kein Silent-Fail).
- Retry/Rate-Limit-Verhalten kommt aus SDK-Transport, wird nicht in UI neu implementiert.

## Kapitel 4 – Events

- Generierte Live-Listen subskribieren versionierte Events via SDK (`sdk.events.on`), Update-In-Place bei `*.created/updated/deleted.v1`.
- `event.skipped` (Schema-Bruch) wird als nicht-destruktive Warnung im UI-Toast gezeigt, Liste bleibt konsistent.
- Generierte UI emittiert keine Events selbst, sondern ruft Band-10-Ingest über Mutation auf – keine zweite EventBus-Architektur.
- Webhook-/SSE-Verbindungsstatus wird als Connection-Indicator in generierten Dashboards dargestellt.
- Replay-Puffer-Typen aus SDK ermöglichen Offline-First-Views mit später Sync-Anzeige.

## Kapitel 5 – Workflows

- Generierte Workflow-Views rendern `WorkflowState`-Phasen aus Band-9/Band-11 (deklarativ, keine Engine im UI).
- `carry uigen workflow <def>` erzeugt Step-Timeline + Resume-Button, der SDK-Resume mit ExecutionKey aufruft.
- Fehlerpfade: `WorkflowFailed` als strukturierter Banner mit Retry-Aktion (SDK-Retry, neuer Key-Variant).
- Long-running Branchenprozesse werden als reine Daten-Views generiert, Steuerung liegt im SDK/Backend.
- Keine Workflow-Logik clientseitig – Generator erzeugt nur Darstellungs-Komponenten.

## Kapitel 6 – Agenten

- Generierte Agent-Chat-Views nutzen `sdk.agent.invoke()`-Streaming (SSE) aus Band-11, kein eigener Agent-Code.
- RoleId-Enum (generiert, Band 93) steuert verfügbare Agent-Auswahl; System-Prompts bleiben serverseitig.
- `ToolResult<T>` wird als validierte, formatierte Karte gerendert; Streaming-Abbruch via `AbortController`.
- Generierte Views sind reine Consumer von Band-11 Runtime – keine zweite Agent-Engine.
- Keine Prompt-Inhalte im generierten Code; nur Referenz-IDs und Darstellungs-Typen.

## Kapitel 7 – UI

- Komponenten nutzen shadcn/Radix + Tailwind (bestehende Design-Tokens), Dark-Mode und a11y out-of-the-box.
- Generierte Forms: Label/Error/Help aus Zod, Pflichtfeld-Marker, serverseitige Validierung als Source of Truth.
- `SdkProvider` + Error-Boundary werden generiert; Envelope-Fehler mappen auf konsistente UI-States.
- Keine Geschäftslogik in Client-Komponenten – alle Rules in Band-10-Services (Architektur-Regel gewahrt).
- Branchen-Presets (z. B. SHK Office) überschreiben nur Layout/Tokens, nie generierte Logik-Stubs.

## Kapitel 8 – Tests

- Unit (Vitest + Testing Library): Render generierter Forms, Assert Zod-Resolver bindet korrekt, tenantId im Scope.
- Visual-Regression: Storybook-Snapshots der generierten Komponenten gegen Baseline (Chromatic/Playwright).
- Integration: generierte Liste gegen Band-10-Mock, Assert Paging/Filter/Envelope-Fehler-State.
- Security-Tests: generierte UI enthält keine Secrets/Prompts; Tenant-Leak (fehlendes Scope) wird als 403-State gezeigt.
- Accessibility-Tests: generierte Forms erfüllen WCAG AA (Label/ARIA), automatisch per axe-Check im CI.

## Kapitel 9 – Security

- Generierte UI nutzt ausschließlich SDK-Auth (Band-10-Token), keine eigene Token-Verarbeitung im Client.
- Autorisierung: Permission-State aus `requireApiPermission`-Scope; fehlende Rechte → sichtbarer 403-State, kein Datenleak.
- Tenant-Isolation: jede View erzwingt TenantScope; Generator verweigert Komponenten ohne tenantId-Filter.
- Keine Secrets/Prompts im generierten Code oder Bundle; Token nur in Secure-Storage/HttpOnly-Cookie.
- Generierte Pakete signiert (provenance), `npm audit` im CI gegen Dependency-Risiken.

## Kapitel 10 – Performance

- Generierte Bundles tree-shakeable, eigene Entry-Points je Band-View; Core-UI-Chunk < 40 KB gzip.
- Listen virtualisieren große Datensätze (Windowing), p95-Render bei 1k Rows < 100 ms, RAM < 120 MB.
- SDK-Cache (ETag) reduziert Repeat-Reads > 60 %; Live-Updates via SSE ohne Full-Refetch.
- Lazy-Loading von Branchen-Views (Code-Split), Initial Load < 2 s auf 4G.
- Generierungslauf inkrementell < 8 s (Watch-Mode); nur geänderte Views werden neu emittiert.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün. 4. Unit/Visual-Tests grün.
5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines/Stores.
7. a11y-Gate (WCAG AA) grün. 8. Bundle-Size-Gate (< 40 KB core gzip) eingehalten.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
