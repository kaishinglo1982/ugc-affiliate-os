# CarryOS Universe – Band 20
# Masterprompt: Ghost Brand Enterprise (VOLLSTÄNDIG)

> Band: 20 | Masterprompt: 20.0 | Status: PLANNED | Gruppe: Core Intelligence
> Abhängigkeit: Band 10 (API Governance), Band 11 (Agentic OS), Band 12 (Content Factory), Band 13 (Growth), Band 16 (Industry Solution Factory)

> Hinweis: Branchenedition. Plant auf Basis der Factory (Band 16); KEIN Core-Fork. Verweist auf bestehende Module in `src/lib/content-intelligence/`, `src/lib/recommendation/`, `src/lib/observability/`, `src/server/services/agents.ts`.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieser Branchenedition. Ghost Brand Enterprise betreibt vollautomatisierte, markenneutrale ("Ghost") Publikations-Editionen: sie kombiniert Content Factory (12), Growth (13) und Observability (15) zu einer weißen Label-Publishing-Edition. Keine eigene Runtime/Engine/Queue/Finance.

- Edition als `IndustryPack` "ghost-brand": aktiviert content-intelligence, recommendation, observability — kein Fork der Ports.
- Ghost-Brand-spezifische Objekte (GhostSite, Syndication, WhiteLabelConfig) sind Tenant-Daten, keine neue Engine.
- Content-Generierung bleibt DRAFT-only (Band 12); automatisierte Verteilung nur nach menschlicher Freigabe.
- Agent-Orchestrierung über `src/server/services/agents.ts`; keine zweite Agent-Schleife.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `TenantEdition` (industryPackId="ghost-brand") aus Band 16 bindet den Tenant.
- `GhostSite` (whiteLabelName, domain), `SyndicationTarget`, `ContentVariant` (aus Band 12) als tenant-isolierte Fachmodelle.
- `WhiteLabelConfig` (Branding, kein Secret) referenziert `PromptReference` aus Band 12.
- Alle Reads über Repository mit `tenantId`-Filter; keine globalen Ghost-Brand-Queries.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `POST /api/v1/ghost/sites` – legt `GhostSite` an, White-Label-Konfiguration, Zod-validiert.
- `POST /api/v1/ghost/syndicate` – verteilt freigegebene `ContentVariant` an `SyndicationTarget`.
- `POST /api/v1/ghost/content/propose` – delegiert an Band-12 `generateVariantProposal` (DRAFT-only).
- `GET /api/v1/factory/edition/:tenantId` – aktive Ghost-Brand-Konfiguration (Band 16).

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `ghost.site.created.v1` – nach `GhostSite`-Anlage, triggert Provisionierung.
- `ghost.content.proposed.v1` – aus Band 12 (DRAFT-only, keine Auto-Publish).
- `ghost.syndicated.v1` – nach Verteilung freigegebener Varianten, tenant-isoliert.
- `ghost.edition.provisioned.v1` – aus Band 16 bei Aktivierung der Edition.

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Site-Flow: `withApiContext` → Zod → `requireApiPermission("ghost:site")` → Persistenz → `ghost.site.created.v1`.
- Content-Flow: Band-12 `generateVariantProposal` → DRAFT-Persistenz; menschliche Freigabe zwingend.
- Syndicate-Flow: nur PUBLISHED-Varianten → `SyndicationTarget` (idempotent via ExecutionKey) → `ghost.syndicated.v1`.
- Keine Fachlogik in Route Handlern; Ghost-Services wrappen Band 12/13.

## Kapitel 6 – Agenten

Agenten/Rollen dieser Edition, registriert in Band 11 Runtime.

- `ghost-publisher-agent` Agent: nutzt Band-12 `variant-generator` im White-Label-Kontext.
- `ghost-syndication-agent` Agent: verteilt freigegebene Varianten, schreibt `SyndicationTarget`.
- `ghost-brand-agent` Agent (lesend): überwacht White-Label-Konsistenz, empfiehlt Aktionen.
- Tools in `agentToolDefinition`; Policies auf Ghost-Scope, kein Core-Schreibzugriff.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- Ghost-Site-Manager: CRUD für `GhostSite` + White-Label-Branding (serverseitig validiert).
- Content-Syndication-Board: erbt Band-12 Variant-UI, zeigt Publish/Distribute-Status.
- Brand-Consistency-View: prüft `WhiteLabelConfig` gegen `PromptReference`.
- Edition-Health: Observability-Metriken (contentVariantGeneratedTotal, recommendationAcceptedTotal) im Ghost-Kontext.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: Syndication lehnt DRAFT-Varianten ab (nur PUBLISHED erlaubt, Band 12 Prinzip).
- Integration: Site→Content→Syndicate-Flow tenant-isoliert end-to-end.
- Security: Cross-Tenant-Zugriff auf fremde `GhostSite`/`SyndicationTarget` → 403.
- Anti-Fork-Test: keine duplizierte Content/Engine-Klasse in Ghost-Modulen.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- `requireApiPermission("ghost:site|ghost:content|ghost:syndicate")` auf Endpunkten.
- `WhiteLabelConfig` enthält keine Secrets; Domain/Name nur Metadaten.
- Logs via `logStructured` mit `workspaceId`/`correlationId`; `redact` Pflicht für PII/Tracking-URLs.
- Kein Auto-Publish: DRAFT-only-Regel aus Band 12 unangetastet; Syndication nur nach Freigabe.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `GhostSite(tenantId)`, `SyndicationTarget(tenantId)`, `ContentVariant(tenantId, status)`.
- Syndication asynchron; `optimizationQueueLagSeconds`/`contentAnalysisDurationMs` als p95-Ziele.
- Edition-Konfig gecacht pro `tenantId` (Band 16 Pattern); White-Label-Cache kurzlebig tenant-scoped.
- Metriken aus Observability, kein separater Ghost-Telemetrie-Store.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: KEINE Core-Forks/Second Engines.
7. DRAFT-only + Syndication-nur-nach-Freigabe-Regel verifiziert.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
