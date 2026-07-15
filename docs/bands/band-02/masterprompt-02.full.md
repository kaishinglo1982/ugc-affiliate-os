# CarryOS Universe – Band 02
# Masterprompt: Architektur & DDD (VOLLSTÄNDIG)

> Band: 2 | Masterprompt: 2.0 | Status: PLANNED | Gruppe: Foundation
> Abhängigkeit: Band 1 (Vision/Strategie)

> Hinweis: Planungs-Masterprompt. Definiert Domänenstruktur, Schichten und DDD-Konventionen für CarryOS Core. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork.

## Kapitel 1 – Architektur

- Schichtenmodell verbindlich: API-Layer (Route Handler) → Service-Layer (Fachlogik) → Repository-Layer (Datenzugriff) → Event/Outbox. Keine Fachlogik in Route Handlern.
- DDD-Bounded-Contexts: Core (branchenneutral), Agentic OS, Content Factory, Growth, Finance, Brancheneditionen – je Context eigene Modelle, geteilt nur über geprüfte Schnittstellen.
- CarryOS Core wird erweitert, nie geforkt; neue Editionen sind Module/Plugins, keine parallele Codebasis.
- Keine zweite Runtime, Engine, Queue, Finance- oder EventBus-Architektur – es gibt exakt eine Instanz pro Infrastrukturprimitiv.
- Hexagonaler Kern: Domänenlogik unabhängig von Framework; Adapter für Next.js, DB, Events sind austauschbar und versioniert.

## Kapitel 2 – Datenmodelle

- Aggregate Root pro Bounded Context; Entities tragen zwingend `tenantId` (Tenant-Isolation by Design, nicht nachträglich).
- Prisma-Schema ist Single Source of Truth für persistierte Modelle; Migrationen versioniert, niemals Ad-hoc-ALTER außerhalb von Migrationen.
- Value Objects (z. B. Money, TenantId, ExecutionKey) als stark typisierte Typen, keine rohen Primitives für kritische Konzepte.
- Repository-Pattern: kein direkter DB-Zugriff außerhalb von Repository-Schicht; alle Queries tenant-gefiltert.
- Domain Events werden als Outbox-Rows persistiert (idempotente Emit-Garantie), nicht direkt im Transaktionscode dispatched.

## Kapitel 3 – APIs

- Route Handler sind dünn: nur Request-Kontext (withApiContext), Zod-Validierung, Delegation an Service, Envelope-Antwort (Band 10 Standard).
- Versionierung im Pfad (`/api/v1/...`); Contracts als Zod-Schemas, doppelt genutzt für Validierung und Typinferenz.
- Keine Geschäftslogik in Endpunkten; Fehler werden als strukturierte Envelope-Errors zurückgegeben (code, message, requestId).
- API-Surface je Bounded Context gekapselt; Cross-Context-Aufrufe über definierte Service-Interfaces, nicht über direkte DB.
- Tenant-Scope ist Teil jedes Contracts; Endpunkte ohne Tenant-Kontext werden durch Architekturtests abgelehnt.

## Kapitel 4 – Events

- Event-Namenskonvention `domain.verb.v1`; Domain Events werden im passenden Bounded Context erzeugt und über zentrale Outbox propagiert.
- Event-Payloads strikt via Zod; Consumer validieren Version, unbekannte Versionen werden still in Dead-Letter verschoben.
- Versionierte Events: Breaking Changes erfordern neue `.v2`, niemals Mutation bestehender Payloads (Rückwärtskompatibilität).
- Kein zweiter EventBus; CarryOS Core EventBus ist einziges Transportmittel, asynchron, at-least-once mit Idempotenz-Key.
- Events tragen tenantId im Envelope, Consumer dürfen niemals fremde Tenants verarbeiten (Isolation im Handler erzwungen).

## Kapitel 5 – Workflows

- Prozess-Template: Request-Kontext → Zod-Validation → Authorization (requireApiPermission) → Service → Repository → Outbox-Event → Envelope.
- Idempotenz über `ExecutionKey` (tenantId + businessKey + intent) in Outbox/Event-Tabelle, Duplicate-Detection auf DB-Ebene.
- Long-running Workflows gehören in Band 9 (Workflow Foundation); Band 2 definiert nur die domänenübergreifende Orchestrierungsgrenze.
- Saga-Pattern für cross-context Transaktionen: kompensierende Events bei Teilfehler, kein verteilter Commit.
- Jeder Workflow-Schritt ist auditierbar (wer, wann, welcher Tenant, welches Resultat).

## Kapitel 6 – Agenten

- Agenten sind Domänenressourcen, registriert in Band 11 Runtime; Band 2 definiert nur Agent-fähige Kontexte (z. B. Content, Growth, Finance).
- Agent-Rollen sind Bounded-Context-spezifisch (z. B. `finance.reconciler`), keine globalen Allzweck-Agenten.
- Agenten rufen ausschließlich geprüfte Tools/Service-Interfaces; keine ungeprüften Direktzugriffe auf externe Systeme.
- Agent-Kontext trägt tenantId; Agenten dürfen nur im autorisierten Workspace agieren (Workspace-Isolation).
- Keine zweite Agent Runtime; Band 11 ist einzige Orchestrierung für Agenten.

## Kapitel 7 – UI

- UI-Schicht konsumiert nur API-Contracts (Envelope), keine direkte Domänenlogik im Client.
- Server Components für Daten, Client Components nur für Interaktion; Fachlogik bleibt serverseitig im Service-Layer.
- Design-System aus CarryOS Core (Tokens, Primitives) verpflichtend, keine eigenen Style-Systeme pro Edition.
- Tenant-/Workspace-Sichtbarkeit wird serverseitig gefiltert, nie im Client entschieden oder über clientseitige Flags gesteuert.
- UI-Komponenten sind wiederverwendbar über Editionsgrenzen hinweg (Core-Components, keine Duplikate).

## Kapitel 8 – Tests

- Unit-Tests (Vitest) für Services/Repositories mit Erfolgs- und Fehlerpfaden, Mock der DB/Event-Infra.
- Integrationstests gegen echte Outbox/Queue mit Tenant-Fixtures, verifizieren Idempotenz und Isolation.
- Architekturtests (z. B. eslint-arch-Tregel): verbieten Fachlogik in Route Handlern, zweite Engines, fehlende tenantId-Filter.
- Contract-Tests: Zod-Schemas gegen Beispiel-Payloads, sicherstellen dass API und Event Contracts konsistent sind.
- Security-Tests: Tenant-Escalation-Versuche (Query ohne/mit falscher tenantId) müssen mit 403/404 enden.

## Kapitel 9 – Security

- Authentifizierung: exakt eine (CarryOS Auth), keine zweite; Sessions/Tokens zentral verwaltet.
- Autorisierung via `requireApiPermission` mit Rollen/Scopes, serverseitig erzwungen in jedem Service-Entry.
- Tenant-Isolation durchgehend: keine Query, kein Event, kein Cache-Eintrag ohne tenantId-Bindung.
- Secrets niemals in Code, Logs, Prompts oder Docs; Free-First Provider-Keys über gesicherten Secret-Store.
- Audit für kritische Änderungen (Finance, Tenant-Config, Permissions) versioniert und tenant-zuordbar.

## Kapitel 10 – Performance

- Indizes verpflichtend auf `(tenantId, ...)` für alle tenant-isolierten Tabellen; Query-Pläne auf p95 prüfen.
- Asynchrone Verarbeitung für Events/Outbox; synchrone Pfade bleiben schlank (Validation → Service → Envelope).
- Caching nur tenant-scoped (Cache-Key enthält tenantId), niemals globaler Cache mit Tenant-Daten.
- p95-Ziel für API-Lesezugriffe < 200ms, Schreibzugriffe < 300ms unter Last (definiert als Gate-Mehrwert).
- N+1-Vermeidung in Repositories (eager/lazy korrekt), Batch-Queries für Aggregate-Ladung.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines, keine Fachlogik in Routes.
7. Tenant-Isolation-Test grün. 8. Contract-Tests (Zod) grün.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
