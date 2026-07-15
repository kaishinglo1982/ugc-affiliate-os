# CarryOS Universe – Band 12
# Masterprompt: Autonomous Content Factory (VOLLSTÄNDIG)

> Band: 12 | Masterprompt: 12.0 | Status: DOCUMENTED | Gruppe: Core Intelligence
> Abhängigkeit: Band 10 (API Governance), Band 11 (Agentic OS)

> Hinweis: Dieser Band hat Code-Bezug im Repository; Masterprompt verweist auf bestehende Module in `src/lib/content-intelligence/`.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Die Content Factory erzeugt ausschließlich DRAFT-Varianten, nie automatische Veröffentlichung. Bestehende Ports in `src/lib/content-intelligence/` werden erweitert, nicht dupliziert. Keine zweite Runtime/Engine/Queue/Finance.

- Provider-Agnostik: `ContentIntelligencePort` in `src/lib/content-intelligence/port.ts` bleibt der einzige Einstiegspunkt; neue Provider nur als Adapter, nie als zweite Klassenhierarchie.
- Budget-Gate vor jedem Modell-Aufruf: `estimateCost()` wird vor `generateVariantProposal()` zwingend evaluiert; Überschreitung blockiert den Call (Policy-Gate).
- Draft-only-Prinzip: KI-erzeugte Varianten werden ausschließlich als Status DRAFT persistiert (`variantProposalResultSchema`), menschliche Freigabe außerhalb der Factory.
- Agenten-Orchestrierung erfolgt über die Band-11-Runtime (`src/server/services/agents.ts`), keine eigene Agent-Schleife.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `ContentAsset`, `ContentVariant`, `PromptReference`: erweitern um `tenantId`, `workspaceId`, `status` (DRAFT/PUBLISHED/ARCHIVED) und `modelReference`.
- `VariantProposal` als abgeleitete Entität mit Fremdschlüssel auf `parentContentAssetId` und `baseVariantId` (siehe `VariantProposalRequest`).
- Analysestruktur `ContentAnalysisResult` (hookType, sentiment, pacing, affiliateDisclosurePresent) ist Zod-validiert und wird 1:1 persistiert.
- Alle Queries via Repository-Schicht mit obligatorischem `tenantId`-Where-Clause; keine rohen `findMany`-Aufrufe ohne Tenant-Filter.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad (`/api/v1/...`).

- `POST /api/v1/content/analyze` – Body via `ContentAnalysisRequest`-Zod-Schema, liefert `ContentAnalysisResult`.
- `POST /api/v1/content/variants/compare` – nutzt `VariantComparisonRequest`, gibt Vergleich + `confidenceScore` zurück.
- `POST /api/v1/content/variants/propose` – `VariantProposalRequest`, erzeugt DRAFT, niemals AUTO-PUBLISH.
- `GET /api/v1/content/variants/:id` – Einzelvariante mit Audit-Metadaten (modelReference, confidenceScore).

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `content.analyzed.v1` – nach erfolgreicher Analyse, Payload enthält `contentAssetId`, `confidenceScore`, `modelReference`.
- `content.variant.proposed.v1` – DRAFT erzeugt; triggert optional Human-Review-Task in Band 11.
- `content.variant.published.v1` – erst nach menschlicher Freigabe, nie aus der Factory heraus.
- `content.budget.exceeded.v1` – wenn `estimateCost` das Tenant-Budget limit überschreitet; blockiert weitere Generierung.

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Analyze-Flow: `withApiContext` → Zod-Validierung → `requireApiPermission("content:analyze")` → `resolveContentIntelligenceProvider().analyzeContent()` → Persistenz → `content.analyzed.v1`.
- Propose-Flow: Budget-Check (`estimateCost`) → Policy-Gate → `generateVariantProposal()` → DRAFT-Persistenz (idempotent via ExecutionKey) → `content.variant.proposed.v1`.
- Compare-Flow: Varianten aus Repository laden (tenant-isoliert) → `compareVariants()` → Envelope-Response.
- Keine Fachlogik in Route Handlern; alle Schritte liegen im Service-Layer.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `content-analyst` Agent: ruft `analyzeContent` periodisch für neue `ContentAsset`s auf (via `src/server/services/agents.ts`, `agentRun`).
- `variant-generator` Agent: erzeugt DRAFT-Vorschläge, gebunden an `PromptReference` und Budget-Limit.
- `compliance-reviewer` Agent (lesend): prüft `affiliateDisclosurePresent` und `productMentionCount` vor Freigabe-Empfehlung.
- Agent-Tool-Calls werden in `agentToolDefinition` registriert und über Policies abgesichert.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- Content-Analyse-Dashboard: zeigt `contentAnalysisResultSchema`-Felder (sentiment, pacing, confidenceScore) als lesbare Karten.
- Variant-Manager: Liste/Detail von `ContentVariant` mit DRAFT/PUBLISHED-Badge und `modelReference`-Herkunft.
- Budget-Indikator: zeigt geschätzte Kosten aus `estimateCost` vor Generierungs-Button.
- Freigabe-Workflow: nur menschliche Aktion darf Status auf PUBLISHED setzen; UI erlaubt kein Auto-Publish.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: `MockContentIntelligenceAdapter` erfüllt `ContentIntelligencePort`; Zod-Schemas lehnen ungültige Scores (>1) ab.
- Integration: `POST /api/v1/content/analyze` mit/ohne Tenant-Kontext; DRAFT-Persistenz verifiziert.
- Security: Cross-Tenant-Zugriff auf fremde `ContentVariant` wird mit 403 blockiert.
- Budget-Test: `estimateCost` über Limit löst `content.budget.exceeded.v1` aus, kein `generateVariantProposal`.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- `requireApiPermission("content:read|content:analyze|content:propose")` auf allen Endpunkten.
- `modelReference` ist kein Secret; echte API-Keys bleiben in Env/Secret-Store, nie im `modelReference`-String.
- Logs über `src/lib/observability/metrics.ts` redact PII und Tracking-URLs (`redact`/`redactText`).
- Keine automatische Veröffentlichung: Publish ist eine separat autorisierte, auditierte Aktion.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `ContentVariant(tenantId, status)`, `ContentAsset(tenantId, createdAt)` für Analyse-Queues.
- Analysen asynchron via bestehende Queue; `contentAnalysisDurationMs` aus Observability als p95-Ziel (<800ms Mock).
- Varianten-Vergleich cached `comparison`-Ergebnis pro `variantIds`-Hash (kurzlebig, tenant-scoped).
- Generierungskostenaggregat `contentVariantGenerationCost` zur Budget-Planung pro Tenant.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Draft-only-Regel verifiziert (kein AUTO-PUBLISH-Pfad existiert).

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
