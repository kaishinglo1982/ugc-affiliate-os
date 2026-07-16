# CarryOS Universe – Band 97
# Masterprompt: Documentation Generator (VOLLSTÄNDIG)

> Band: 97 | Masterprompt: 97.0 | Status: PLANNED | Gruppe: Developer Platform
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

## Kapitel 1 – Architektur

- Der Documentation Generator (`@carryos/docgen`) erzeugt aus Code-Contracts (OpenAPI, Zod, JSDoc, Prisma, Workflow-Defs) Versionierte Docs – er konsumiert Band-10-Standard als Source of Truth, forkt keinen Core.
- Pipeline: `Contracts (Band 93/95) + JSDoc → Doc-IR → Emitter (Markdown/OpenAPI/HTML/SDK-Reference) → docs/`.
- Doc-IR ist sprachagnostisch; Emitter (MD, ReDoc, TypeDoc) registrieren sich pluginartig, Branchen-Docs als Presets.
- Generator ist Build-Time, idempotent (stabile Hashes), als `carry docgen` und CI-Schritt (`docgen:check`).
- Keine Dokumentations-Engine zur Laufzeit – reines statisches Build-Artefakt, das bestehende Inhalte spiegelt.

## Kapitel 2 – Datenmodelle

- Doc-IR-Modell `ApiDocNode` bildet Resource, Verben, Zod-Schema, Permission-Scope, Event-Emit ab.
- `ModelDoc` leitet Felder/Relationen/`tenantId`-Pflicht aus Prisma ab; sphärische Typen aus Band-93-Generated.
- `EventDoc` dokumentiert `event.name.v1` + versionierte Payload, inkl. Deprecation und Consumer-Hinweis.
- `WorkflowDoc` beschreibt Band-9/Band-11-Prozesse deklarativ (Phasen, ExecutionKey, Retry) ohne Codierung.
- Versionierung: Docs tragen `/vN/`-Pfad, Breaking Changes erzeugen neue Version, Alte bleiben lesbar.

## Kapitel 3 – APIs

- Generierte API-Referenz spiegelt Band-10-Endpunkte: Envelope `{ ok, data, error, meta }`, Version im Pfad.
- Pro Endpoint: Request/Response-Zod, Tenant-Scope-Hinweis, Permission-`requireApiPermission`-Scope, Idempotenz-Key.
- OpenAPI-Emit (Quelle für Band 93) wird mitgeneriert; Drift-Check gegen live Routes (`docgen:check`).
- Beispiel-Payloads werden aus `ContractFixture` (Band 96) gezogen → Docs immer ausführbar/adäquat.
- Rate-Limit/Retry-Verhalten aus SDK-Transport wird dokumentiert, nicht neu spezifiziert.

## Kapitel 4 – Events

- Event-Katalog dokumentiert alle `event.name.v1` aus Outbox/Registry, inkl. Payload-Schema und Consumer-Beispiel.
- `event.skipped`-Verhalten (Schema-Bruch → Audit) wird als Resilience-Hinweis dokumentiert.
- Webhook-Doku: HMAC-Verifikation über Band-10-Secret, Beispiel-Signature-Code (ohne Hardcoded Secret).
- Kein eigener EventBus dokumentiert – nur bestehende Outbox/Queue (Band 5/10) als Event-Quelle.
- Versionierungs-Policy: additive v2, kompatible v1 bleibt, Migration-Guide bei Breaking Change.

## Kapitel 5 – Workflows

- Workflow-Katalog rendert `WorkflowState`-Phasen, ExecutionKey-Idempotenz und Retry aus Band-9/Band-11.
- `docgen workflow <def>` erzeugt Sequence-Diagramm (Mermaid) + Parameter-Referenz, rein deklarativ.
- Fehlerpfad-Doku: `WorkflowFailed`-Event + Retry-Hinweis, kein verlorener State.
- Keine Workflow-Engine dokumentiert – nur Ausführungs-Contracts der bestehenden Runtime.
- Branchenprozesse (Angebot→Auftrag) als Daten-Views, Steuerung in SDK/Backend.

## Kapitel 6 – Agenten

- Agent-Katalog listet Band-11-Rollen (RoleId-Enum, Band 93) mit Tool-Schemas und `ToolResult<T>`-Typen.
- Streaming-Doku (SSE) mit `AbortController`-Abbruch-Beispiel; System-Prompts bleiben serverseitig (nicht in Docs).
- Tool-Calling-Referenz zeigt typsichere Argumente/Resultate, Beispiel-Code nur mit Referenz-IDs.
- Keine Agent-Engine dokumentiert – nur Consumer-Contracts der Band-11 Runtime.
- Permission-Scopes pro Rolle aus Band-10, Dokumentation der Zugriffsrechte.

## Kapitel 7 – UI

- UI-Doku generiert Komponenten-Reference aus Band-94-Output: Props, Zod-Resolver, Fachvertrag (keine Logik).
- `SdkProvider`/Envelope-Fehler-Mapping dokumentiert; Beispiel-Code nutzt generierte Hooks.
- Branchen-Presets (SHK Office) als Style-Guide-Erweiterung, keine Logik-Duplikate.
- Keine UI-Fachlogik dokumentiert – nur Contracts der generierten Komponenten (Consumer-Sicht).
- Storybook-Integration: generierte Fixtures als live Docs, a11y-Hinweise (WCAG AA) inklusive.

## Kapitel 8 – Tests

- Unit (Vitest): Doc-IR-Parser, Emitter-Roundtrip (Input→Doc→re-parse Metadaten), Determinismus (stabile Hashes).
- Doc-Tests: generierte OpenAPI gegen Band-93-Client (Drift), `docgen:check` fehlschlägt bei Mismatch.
- Link-Check: alle internen Doc-Links aufgelöst, keine toten Referenzen (CI-Gate).
- Example-Tests: dokumentierte Code-Snippets werden als Executable-Snippets gegen Test-Tenant ausgeführt.
- Security-Review: generierte Docs enthalten keine Secrets/Prompts (Scan-Gate).

## Kapitel 9 – Security

- Generator liest Contracts aus vertrauenswürdigen Repo-Quellen; kein Remote-Fetch ohne Signatur, keine Injection.
- Dokumentierte Beispiele nutzen Test-Tenant/Tokens; niemals Produktions-Secret oder echte Prompt-Inhalte.
- Tenant-Isolation wird in API-Docs explizit als Pflicht vermerkt (Scope-Hinweis bei jedem Endpoint).
- Keine Secrets/Hardcoded-Keys in generierten Docs; Webhook-Beispiele referenzieren env-basiertes Secret.
- Generierte Docs-Artefakte signiert (provenance), `npm audit` im CI gegen Supply-Chain-Risiken.

## Kapitel 10 – Performance

- Doc-IR-Build cached pro Datei; inkrementeller Lauf < 10 s für typische Band-Contracts (Watch-Mode).
- Multi-Emitter (MD/HTML/OpenAPI) parallel über Worker-Pool, Gesamtlauf < 40 s für volle Universe-Docs.
- Emit schreibt nur bei Hash-Change → keine unnötigen Rebuilds, CI-Diff minimal.
- Static-Output optimiert (MD als Quelle für Docusaurus), Build < 60 s für 1000+ Seiten.
- Memory-Cap < 512 MB für volle Doc-IR; Streaming-Emit vermeidet volle In-Memory-Outputs.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün. 4. Unit-Tests grün.
5. `docgen:check` grün (kein Drift/Link-Rot). 6. Architekturtests: keine zweiten Engines.
7. Secret-Scan grün (keine Secrets/Prompts in Docs). 8. Determinismus-Gate (stabile Hashes).

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
