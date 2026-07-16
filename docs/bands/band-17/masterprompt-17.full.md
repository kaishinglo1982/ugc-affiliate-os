# CarryOS Universe – Band 17
# Masterprompt: SHK Office Enterprise (VOLLSTÄNDIG)

> Band: 17 | Masterprompt: 17.0 | Status: PLANNED | Gruppe: Core Intelligence
> Abhängigkeit: Band 10 (API Governance), Band 11 (Agentic OS), Band 16 (Industry Solution Factory)

> Hinweis: Branchenedition. Plant auf Basis der Factory (Band 16); KEIN Core-Fork. Verweist auf bestehende Module in `src/lib/finance/`, `src/lib/observability/`, `src/server/services/agents.ts`.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieser Branchenedition. SHK Office (Sanitär/Heizung/Klima) ist eine konfigurierte Edition über Band 16 — sie erbt Content (12), Growth (13), Finance (14), Infra (15) und aktiviert branchenspezifische Agent-Rollen. Keine eigene Runtime/Engine/Queue/Finance.

- Edition als `IndustryPack` "shk-office": aktiviert Module finance, observability, agent-runtime — kein Fork von `src/lib/finance/`.
- SHK-spezifische Domänenobjekte (Angebot, Wartung, Montage-Termin) liegen als Tenant-Daten, nicht als neue Engine.
- Agent-Orchestrierung ausschließlich über `src/server/services/agents.ts` (`agent`, `agentRun`).
- Branchen-UI erweitert bestehende Dashboards, dupliziert keine Core-Komponenten.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `TenantEdition` (industryPackId="shk-office") bindet den Tenant an die Edition (aus Band 16).
- `ShkOffer`, `ShkServiceOrder`, `ShkWarranty` als tenant-isolierte Fachmodelle mit `tenantId`, `workspaceId`.
- Finanzbuchungen laufen über `Revenue`/`Expense` aus Band 14 — kein zweites Finanzmodell.
- Alle Reads über Repository mit `tenantId`-Filter; keine globalen SHK-Queries.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `POST /api/v1/shk/offers` – Angebotserstellung, Buchung via Band-14 Finance (Decimal).
- `GET /api/v1/shk/service-orders` – listet `ShkServiceOrder` tenant-isoliert.
- `POST /api/v1/shk/warranty/check` – Garantieprüfung, lesend, Zod-validiert.
- `GET /api/v1/factory/edition/:tenantId` – liefert aktive SHK-Konfiguration (geerbt aus Band 16).

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `shk.offer.created.v1` – nach Angebotserstellung, triggert Finance-Snapshot (Band 14).
- `shk.service-order.closed.v1` – Abnahme, erzeugt Revenue-Buchung (Band 14 Event).
- `shk.warranty.review.v1` – Garantiefall zur Prüfung, auditierbar.
- `shk.edition.provisioned.v1` – aus Band 16 bei Aktivierung der SHK-Edition.

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Offer-Flow: `withApiContext` → Zod → `requireApiPermission("shk:offer")` → Persistenz → `finance.transaction.recorded.v1` (Band 14).
- Service-Order-Flow: Anlage → Schließen (idempotent via ExecutionKey) → Revenue-Buchung → Event.
- Warranty-Flow: Prüfung → `shk.warranty.review.v1` → optional Agent-Task (Band 11).
- Keine Fachlogik in Route Handlern; SHK-Services im Service-Layer, Finance via `src/lib/finance/`.

## Kapitel 6 – Agenten

Agenten/Rollen dieser Edition, registriert in Band 11 Runtime.

- `shk-offer-agent` Agent: erstellt Angebotsentwürfe, nutzt Finance `summarizeFinance` für Marge.
- `shk-dispatch-agent` Agent: plant Montage-Termine, schreibt `ShkServiceOrder`.
- `shk-warranty-agent` Agent (lesend): prüft Garantiefälle, empfiehlt Aktion.
- Tools in `agentToolDefinition`; Policies auf SHK-Scope begrenzt (kein Core-Schreibzugriff).

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- SHK-Angebotsassistent: Form → server-seitige Margenberechnung via `src/lib/finance/format.ts`.
- Service-Order-Board: Liste/Detail `ShkServiceOrder` mit Status-Transitions (serverseitig).
- Warranty-Center: Garantiefall-Liste mit Review-Aktion.
- Finance-Einblick: eingebettetes Band-14-Dashboard (Contribution Margin) im SHK-Kontext.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: Angebots-Marge korrekt via `summarizeFinance` (Decimal, cent-genau).
- Integration: Offer→Service-Order→Revenue-Flow tenant-isoliert end-to-end.
- Security: Cross-Tenant-Zugriff auf fremde `ShkOffer` → 403.
- Anti-Fork-Test: keine duplizierte Finance/Engine-Klasse in SHK-Modulen.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- `requireApiPermission("shk:offer|shk:service|shk:warranty")` auf Endpunkten.
- Angebotsdaten (Kunden, Adressen) als PII via `redact` aus Observability maskiert.
- Logs via `logStructured` mit `workspaceId`/`correlationId`; keine Secrets in SHK-Konfig.
- Kritische Angebotsänderungen auditierbar (Band 16 Audit-Event).

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `ShkOffer(tenantId, status)`, `ShkServiceOrder(tenantId, closedAt)`, `ShkWarranty(tenantId)`.
- Angebotsberechnung asynchron; `optimizationQueueLagSeconds` reuse als p95-Ziel (<20s).
- Edition-Konfig gecacht pro `tenantId` (Band 16 Pattern); Invalidierung bei Modul-Toggle.
- Metriken aggregiert aus Observability, kein separater SHK-Store.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: KEINE Core-Forks/Second Engines.
7. Finance ausschließlich via `src/lib/finance/` (kein SHK-eigenes Modell).

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
