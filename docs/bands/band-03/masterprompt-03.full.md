# CarryOS Universe – Band 03
# Masterprompt: Monorepo & Standards (VOLLSTÄNDIG)

> Band: 3 | Masterprompt: 3.0 | Status: PLANNED | Gruppe: Foundation
> Abhängigkeit: Band 1 (Vision/Strategie)

> Hinweis: Planungs-Masterprompt. Definiert Monorepo-Struktur, Tooling und verbindliche Code-Standards für CarryOS Core. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork.

## Kapitel 1 – Architektur

- Ein Monorepo für CarryOS Core + Editionsmodule; Pakete als interne Workspace-Packages (`packages/core`, `packages/agentic`, `packages/finance` ...), keine separaten Repos.
- Workspace-Isolation: Editionsmodule importieren nur über deklarierte Package-Grenzen, keine relativen Cross-Package-Imports außerhalb des Public API.
- Build-Pipeline nutzt bestehende Next.js/TS-Tooling; keine zweite Build-Engine neben der definierten Toolchain.
- Shared-Konfiguration (tsconfig strict, eslint, prettier) zentral in Root, vererbt an alle Packages – keine lokalen Abweichungen.
- Feature-Branches pro Masterprompt; ein Masterprompt/klarer Teilschritt pro Commit, keine großen unzusammenhängenden Commits.

## Kapitel 2 – Datenmodelle

- Schema-Quelle zentral unter `packages/core/prisma`; Editions-spezifische Modelle als erweiternde Migrations, niemals Fork des Basisschemas.
- Gemeinsame Typen (TenantId, Money, ExecutionKey) als Core-Package exportiert, von allen Packages konsumiert – keine lokale Neudefinition.
- Migrationen sind versioniert und linear; jede Migration referenziert den betroffenen Band/Masterprompt im Kommentar.
- Tenant-Isolation im Schema erzwungen: jede tenant-relevante Tabelle besitzt NOT-NULL `tenantId` mit Index.
- Seed/Test-Fixtures liegen pro Package, nutzen gemeinsame Tenant-Fixtures aus Core, keine duplizierten Test-Tenants.

## Kapitel 3 – APIs

- API-Route-Konvention: `apps/*/api/v1/<context>/<resource>`; Handler-Skeleton aus Core-Template (withApiContext + Zod + Envelope).
- Shared API-Helfer (Envelope-Builder, withApiContext, requireApiPermission) als Core-Package, keine lokale Kopie pro App.
- OpenAPI/Contract-Dokumentation wird aus Zod-Schemas generiert, keine manuell gepflegte, divergierende Spezifikation.
- Versionierung im Pfad verpflichtend; Deprecation nur mit neuer Version + Sunset-Hinweis, niemals stille Breaking Changes.
- Lint-Regel: jede Route muss Zod-Schema + Envelope zurückgeben, sonst Build-Fehler.

## Kapitel 4 – Events

- Event-Definitionen als zentrale Zod-Schemas in `packages/core/events`; Consumer/Producer teilen dieselben Schemas (Single Source).
- Event-Bus-Client als Core-Package (publish/subscribe über Outbox), kein Package implementiert eigenen Transport.
- Event-Versionen im Schema-Namen (`*.v1`); Breaking Changes erzeugen neue Schema-Datei, alte bleibt lesbar.
- Tenant-Isolation: Event-Envelope trägt tenantId, Publish/Subscribe filtern zwingend nach tenantScope.
- CI-Check: unversionierte Events oder fehlende Zod-Schemas brechen den Build.

## Kapitel 5 – Workflows

- Workflow-Definitionen (Band 9) als versionierte Dateien im jeweiligen Package; kein Package baut eigene Workflow-Engine.
- ExecutionKey-Convention (tenantId + businessKey + intent) zentral im Core-Package definiert und von allen Workflows genutzt.
- CI-Pipeline: Lint → Typecheck → Unit → Integration → Architekturtests in fester Reihenfolge, parallelisierbar pro Package.
- Idempotenz-Test-Hook in CI: jeder Workflow-Schritt muss bei Duplicate-ExecutionKey idempotent bleiben.
- Release-Workflow: nur Packages mit grünen Gates dürfen publiziert werden (Release Management, Band 99).

## Kapitel 6 – Agenten

- Agent-Definitionen als deklarierte Ressourcen in `packages/agentic` (Band 11 Runtime), keine Agent-Logik verstreut in Editionspackages.
- Agent-Tools sind registrierte, geprüfte Funktionen; ungeprüfte Direktzugriffe sind per Lint verboten.
- Workspace-/Tenant-Kontext wird Agenten zentral injiziert, nicht pro Aufruf manuell übergeben.
- Keine zweite Agent Runtime; alle Agenten laufen über Band 11, orchestriert durch Core-Workflows.
- Agent-Tests im Package, nutzen gemockte Tool-Registry, verifizieren Tenant-Scope-Durchsetzung.

## Kapitel 7 – UI

- UI-Komponenten in `packages/ui` (Design-System/Tokens), Editions-Apps konsumieren, keine lokalen Style-Duplikate.
- App-Struktur: `apps/<edition>/` mit Pages + dünnen Client Components; Fachlogik in Server/Service-Layer.
- Lint-Regel: keine Geschäftslogik in `'use client'`-Komponenten, sonst Build-Fehler.
- Komponenten-Tree-Shaking verpflichtend, keine ungenutzten Imports (dead-code-Lint).
- Storybook/Test-Fixtures für UI zentral, je Edition nur Edition-spezifische Overrides.

## Kapitel 8 – Tests

- Vitest als einzige Unit/Integration-Test-Runtime; keine zweite Test-Framework-Linie im Monorepo.
- Test-Layering: Unit (Mock Infra) → Integration (echte DB/Queue, Tenant-Fixtures) → Architekturtests (Lint-Regeln).
- Coverage-Gate: kritische Pfade (Auth, Tenant-Filter, Idempotenz) müssen abgedeckt sein, Schwellwert als CI-Parameter.
- Architekturtests als eslint-Regeln: verbieten zweite Engines, Fachlogik in Routes, fehlende tenantId.
- Fixtures: gemeinsamer Tenant-Pool aus Core, deterministisch, keine harten Abhängigkeiten zwischen Testfällen.

## Kapitel 9 – Security

- Secret-Management zentral (Core Secret-Store); keine Secrets in `.env` committet, keine in Code/Logs/Docs.
- Lint/CI: Scannt nach hartkodierten Keys/Pfaden, blockiert Commits mit Verdacht auf Secret-Leak.
- Autorisierung zentral via `requireApiPermission`; Rollen/Scopes in Core definiert, Editionen erweitern nur deklarativ.
- Dependency-Audit in CI (npm audit / advisories), keine ungeprüften Dependencies mit kritischen CVEs.
- Tenant-Isolation als Architekturtest: Queries ohne tenantId-Filter werden im Repository-Layer abgewiesen.

## Kapitel 10 – Performance

- Build-Cache (Turborepo/Next) zwingend, inkrementelle Builds pro Package, keine Voll-Builds bei Einzeländerung.
- p95-Ziele in CI-Metriken erfasst: API-Lese < 200ms, Schreib < 300ms, Event-Latenz < 500ms unter Testlast.
- Bundle-Size-Gate für UI: Edition-Bundles dürfen Core-Baseline nur innerhalb definiertem Budget überschreiten.
- Indizes auf `(tenantId, ...)` verpflichtend, Query-Plan-Check in Integrationstests für Hot Paths.
- Parallele CI-Jobs pro Package, serielle Gate-Kette nur für Release-relevante Pakete.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün (inkl. Architekturtests). 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Secret-Scan grün. 7. Build-Cache nutzbar.
8. Tenant-Isolation-Test grün.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
