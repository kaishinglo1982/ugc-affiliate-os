# CarryOS Universe – Band 19
# Masterprompt: CarryBrain Enterprise AI (VOLLSTÄNDIG)

> Band: 19 | Masterprompt: 19.0 | Status: PLANNED | Gruppe: Core Intelligence
> Abhängigkeit: Band 10 (API Governance), Band 11 (Agentic OS), Band 12 (Content Intelligence), Band 15 (Observability), Band 16 (Industry Solution Factory)

> Hinweis: Branchenedition / Enterprise AI-Layer. Plant auf Basis der Factory (Band 16); KEIN Core-Fork. Verweist auf bestehende Module in `src/lib/content-intelligence/`, `src/lib/observability/`, `src/server/services/agents.ts`.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. CarryBrain Enterprise AI ist der zentrale KI-Entscheidungs-Layer: er nutzt die bestehenden Provider-Ports (Band 12) und die Agent-Runtime (Band 11) als einzige Ausführungswege. Keine zweite Runtime/Engine/Queue/Finance.

- KI-Entscheidungen laufen ausschließlich über `ContentIntelligencePort` (provider-agnostisch) aus Band 12 — kein neuer Modell-Adapter-Typ.
- CarryBrain-„Brain"-Logik ist eine Konfigurations-/Prompt-Schicht über Band-11-Agenten, kein eigener Reasoning-Server.
- Alle Modell-Aufrufe budget-gegated (Band 12 `estimateCost`); keine ungeprüften Direktaufrufe.
- Telemetrie ausschließlich via `src/lib/observability/metrics.ts` (`METRICS`, `logStructured`).

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `TenantEdition` (industryPackId="carrybrain-ai") aus Band 16 bindet den Tenant.
- `BrainDecision` (input, output, modelReference, confidenceScore, tenantId, workspaceId) — auditierbar.
- `PromptTemplate` (referenziert `PromptReference` aus Band 12), `BrainRun` (an `agentRun` gebunden).
- Alle Reads über Repository mit `tenantId`-Filter; Decisions niemals global aggregiert.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `POST /api/v1/brain/decide` – delegiert an Band-12 Port, liefert `BrainDecision` (DRAFT-Prinzip für Inhalte).
- `GET /api/v1/brain/decisions` – listet `BrainDecision` tenant-isoliert.
- `POST /api/v1/brain/prompts` – verwaltet `PromptTemplate`, Zod-validiert.
- `GET /api/v1/factory/edition/:tenantId` – aktive CarryBrain-Konfiguration (Band 16).

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `brain.decision.made.v1` – nach KI-Entscheidung, Payload `modelReference`, `confidenceScore`.
- `brain.budget.exceeded.v1` – aus Band 12 bei Kostenlimit (blockiert weitere Calls).
- `brain.prompt.updated.v1` – bei Änderung von `PromptTemplate`.
- `brain.edition.provisioned.v1` – aus Band 16 bei Aktivierung der Edition.

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Decide-Flow: `withApiContext` → Zod → `requireApiPermission("brain:decide")` → Budget-Check (`estimateCost`) → Band-12 Port → `BrainDecision`-Persistenz → Event.
- Prompt-Flow: CRUD auf `PromptTemplate` idempotent via ExecutionKey → `brain.prompt.updated.v1`.
- Run-Flow: CarryBrain-Tasks als `agentRun` in `agents.ts`, kein separater Scheduler.
- Keine Fachlogik in Route Handlern; Brain-Services wrappen Band 12/11.

## Kapitel 6 – Agenten

Agenten/Rollen dieser Edition, registriert in Band 11 Runtime.

- `brain-reasoner` Agent: führt Entscheidungen über Band-12 Port aus, budget-gebunden.
- `brain-prompt-curator` Agent: pflegt `PromptTemplate`-Bibliothek, lesend/schreibend.
- `brain-auditor` Agent (lesend): prüft `confidenceScore`/`modelReference` für Nachvollziehbarkeit.
- Tools in `agentToolDefinition`; Policies auf Brain-Scope, kein Core-Schreibzugriff.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- Brain-Decision-Explorer: Liste `BrainDecision` mit `confidenceScore`, `modelReference`-Herkunft.
- Prompt-Library: CRUD-UI für `PromptTemplate`, gebunden an Band-12 `PromptReference`.
- Budget-Monitor: zeigt `estimateCost`-Schwellwert und Auslastung (Observability-Metriken).
- Run-Insight: `agentRun`-Tabelle aus `agents.ts` im CarryBrain-Kontext.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: Budget-Gate blockiert `decide` bei `estimateCost` über Limit (Band 12 Logik).
- Integration: Decide-Flow tenant-isoliert; `BrainDecision` korrekt zugeordnet.
- Security: Cross-Tenant-Lesezugriff auf fremde `BrainDecision` → 403.
- Anti-Fork-Test: keine zweite Modell-Adapter-Hierarchie neben `ContentIntelligencePort`.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- `requireApiPermission("brain:decide|brain:prompt|brain:read")` auf Endpunkten.
- `modelReference` ist kein Secret; echte Keys nur in Env/Secret-Store.
- Logs via `logStructured` mit `correlationId`/`workspaceId`; `redact` Pflicht für PII.
- Entscheidungen auditierbar (`BrainDecision` + Event); keine versteckten Auto-Aktionen.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `BrainDecision(tenantId, createdAt)`, `PromptTemplate(tenantId)`, `BrainRun(tenantId)`.
- Entscheidungen asynchron; `contentAnalysisDurationMs` reuse als p95-Ziel (<800ms Mock).
- Prompt-Cache pro `tenantId` (kurzlebig); Invalidierung bei `brain.prompt.updated.v1`.
- Metriken aus Observability, kein separater Brain-Telemetrie-Store.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: KEINE zweiten Engines/Adapter.
7. Budget-Gate + DRAFT-only-Regel verifiziert.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
