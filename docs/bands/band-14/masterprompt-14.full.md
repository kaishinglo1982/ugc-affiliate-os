# CarryOS Universe – Band 14
# Masterprompt: Business & Finance OS (VOLLSTÄNDIG)

> Band: 14 | Masterprompt: 14.0 | Status: DOCUMENTED | Gruppe: Core Intelligence
> Abhängigkeit: Band 10 (API Governance), Band 11 (Agentic OS)

> Hinweis: Dieser Band hat Code-Bezug im Repository; Masterprompt verweist auf bestehende Module in `src/lib/finance/` und `src/lib/observability/`.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Business & Finance OS ist die EINZIGE Finanz-Engine des Universums. Bestehende Logik in `src/lib/finance/calculations.ts` und `src/lib/finance/format.ts` wird erweitert. Keine zweite Runtime/Engine/Queue/Finance.

- Einzige Geldberechnung über `Money` (Prisma Decimal) aus `calculations.ts`; keine Floats für Währungswerte.
- `summarizeFinance()` und `estimateTaxReserve()` sind die einzigen Summations- und Reserve-Funktionen; Erweiterungen nur dort.
- Finanz-Agenten orchestriert über Band-11-Runtime (`src/server/services/agents.ts`), keine eigene Finanz-Queue.
- Reporting baut auf Observability-Metriken auf; keine zweite Stats-/BI-Engine.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `Revenue`, `Expense` mit `tenantId`, `workspaceId`, `currency`, `amount` (Decimal), `occurredAt`.
- `FinanceSummarySnapshot` (felder aus `FinanceSummary`: totalRevenue, totalExpense, contributionMargin, provisionalProfit).
- `TaxReserveEstimate` (felder aus `TaxReserveResult`: generalReserve, tradeTaxReserve, incomeTaxReserve, totalReserve, netAfterReserve).
- Alle Aggregationen via Repository mit `tenantId`-Filter; nie global über alle Tenants summieren.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `POST /api/v1/finance/summarize` – Body: Revenue/Expense-Listen, liefert `FinanceSummary` (Decimal-Strings).
- `POST /api/v1/finance/tax-reserve` – Body: `TaxReserveInput`, liefert `TaxReserveResult`.
- `GET /api/v1/finance/snapshot/:id` – persistierter Snapshot inkl. Audit-Metadaten.
- `POST /api/v1/finance/expense|revenue` – Erfassung mit Zod-Validierung (Decimal als String).

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `finance.summary.created.v1` – nach `summarizeFinance`, Payload `provisionalProfit`.
- `finance.tax-reserve.estimated.v1` – nach `estimateTaxReserve`, markiert als unverbindliche Schätzung.
- `finance.transaction.recorded.v1` – bei neuer Revenue/Expense, tenant-isoliert.
- `finance.audit.review.v1` – kritische Änderungen (Korrekturbuchungen) erfordern Audit-Trail.

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Summarize-Flow: `withApiContext` → Zod → `requireApiPermission("finance:read")` → `summarizeFinance()` → Snapshot-Persistenz → Event.
- Tax-Reserve-Flow: `estimateTaxReserve()` mit konfigurierten Prozentwerten → Result → UI-Label "unverbindliche Schätzung" (Pflicht).
- Record-Flow: Transaction-Insert idempotent via ExecutionKey → `finance.transaction.recorded.v1`.
- Keine Fachlogik in Route Handlern; alle Beträge via `toMoney()`/`sumMoney()`.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime.

- `finance-reconciler` Agent: gleicht Revenue/Expense periodisch ab, erzeugt `FinanceSummarySnapshot`.
- `tax-reserve-planner` Agent (lesend/schreibend): plant Reserven, nie Steuerberatung — UI-Label bleibt Pflicht.
- `finance-auditor` Agent: prüft kritische Buchungen, schreibt Audit-Events.
- Tools in `agentToolDefinition` mit strikten Policies (kein Löschen, nur Append/Korrektur).

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- Finance-Dashboard: zeigt `FinanceSummary` (Contribution Margin, Provisional Profit) via `format.ts`.
- Tax-Reserve-Karte: zwingend mit Hinweis "unverbindliche Schätzung, keine Steuerberatung".
- Transaction-Ledger: Liste Revenue/Expense mit `currency` und Decimal-Präzision.
- Audit-View: chronologische Audit-Trail-Einträge kritischer Änderungen.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: `summarizeFinance` und `estimateTaxReserve` mit Decimal-Kantenfällen (0, negativ, Rundung).
- Integration: Summarize-Flow mit Tenant-Kontext; Snapshot korrekt tenant-zugeordnet.
- Security: Cross-Tenant-Lesezugriff auf fremde `FinanceSummarySnapshot` → 403.
- Format-Test: `format.ts` rendert Decimal ohne Präzisionsverlust (Cent-genau).

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- `requireApiPermission("finance:read|finance:write|finance:audit")` auf Endpunkten.
- Keine Steuer- oder Bank-Secret in `TaxReserveResult`/`FinanceSummary`; nur Schätzwerte.
- Logs via `logStructured` mit `workspaceId`; sensible Beträge nicht in Plain-Text-Logs.
- Audit für alle korrigierenden Buchungen zwingend (Event + DB-Trail).

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `Revenue(tenantId, occurredAt)`, `Expense(tenantId, occurredAt)`, Snapshot(tenantId).
- Summierung asynchron über Repository; `optimizationQueueLagSeconds` reuse als p95-Leitmetrik (<20s).
- Snapshot-Cache pro `tenantId`+Periode (kurzlebig), Invalidierung bei neuer Transaction.
- Decimal-Berechnungen bleiben server-seitig; Client erhält fertig formatierte Strings.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: KEINE zweite Finance-Engine.
7. Tax-Reserve-UI trägt zwingend "unverbindliche Schätzung"-Label.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
