# CarryOS Universe – Band 45
# Masterprompt: Einkauf (VOLLSTÄNDIG)

> Band: 45 | Masterprompt: 45.0 | Status: PLANNED | Gruppe: Commerce & Sales
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork erlaubt

> Hinweis: Fachmodul baut ohne Fork auf CarryOS Core auf. Bestellungen an Lieferanten (Band 48); Finanzfreigabe über Band 14.

## Kapitel 1 – Architektur

- Einkaufsmodul als Package `src/modules/commerce/procurement/`; keine eigene Runtime, DB oder Queue.
- Bestellanforderung (PR), Purchase Order (PO) und Lieferantenauswahl sind fachliche Aggregate über Core-Repository mit `tenantId`-Filter.
- Freigabe-Workflow nutzt Band-14-Budgetprüfung; dieses Modul speichert nur verschlüsselte Bestellbeträge.
- Nutzt Band-11-Agenten für Lieferanten-Empfehlung und Preisvergleich.

## Kapitel 2 – Datenmodelle

- Entität `PurchaseRequisition` (id, tenantId, requesterAgentId, costCenter, itemsJson, status, budgetRef) – interner Bedarf.
- Entität `PurchaseOrder` (id, tenantId, supplierId, prId, linesJson, totalNetEnc, currency, approvalState) – Freigabestatus.
- Entität `PoApproval` (id, tenantId, poId, approverAgentId, decision, decidedAt, noteEnc) – Vier-Augen-Prinzip.
- Entität `SupplierQuote` (id, tenantId, supplierId, prId, totalEnc, validUntil) – Lieferanten-Angebot.
- Alle Modelle zwingend `tenantId`; Schema nur im Commerce-Namespace.

## Kapitel 3 – APIs

- `POST /api/v1/commerce/procurement/requisitions` – Bedarf anlegen; Zod `prCreateSchema`, Envelope.
- `POST /api/v1/commerce/procurement/orders` – PO aus PR erzeugen; `procurement.po.created.v1`.
- `POST /api/v1/commerce/procurement/orders/:id/approve` – Freigabe; `procurement.po.approved.v1`.
- `GET /api/v1/commerce/procurement/supplier-quotes?prId=` – Angebotsvergleich, tenant-isoliert.
- `GET /api/v1/commerce/procurement/orders?approvalState=` – PO-Liste gefiltert.

## Kapitel 4 – Events

- `procurement.pr.created.v1` – nach Bedarfserfassung; konsumiert von Band 48 (Lieferant).
- `procurement.po.created.v1` – nach PO-Erzeugung; triggert Budget-Prüfung Band 14.
- `procurement.po.approved.v1` – nach Freigabe; konsumiert von Band 48 (Bestellübermittlung).
- `procurement.po.rejected.v1` – bei Ablehnung; für Requester-Notification.
- Events versioniert über Outbox; Beträge nur verschlüsselt im Payload.

## Kapitel 5 – Workflows

- PR→PO: ApiContext → Zod → requireApiPermission(procurement:write) → ProcurementService → Repository → Outbox → Envelope.
- Freigabe: Service → Band-14-Budget-Check → `PoApproval` → `procurement.po.approved.v1`; idempotent via PO-Id.
- Lieferantenauswahl: Agent → `SupplierQuote`-Vergleich → Empfehlung; keine Logik im Handler.

## Kapitel 6 – Agenten

- `ProcurementAdvisorAgent`: empfiehlt Lieferant aus Historie und `SupplierQuote`.
- `BudgetGuardAgent`: prüft PO gegen Band-14-Budget und flaggt Überschreitung.
- `PoReminderAgent`: mahnt offene Freigaben und lieferantenoffene POs.
- Registrierung in Band-11-Runtime; bestehende Tool-Schnittstellen.

## Kapitel 7 – UI

- `ProcurementDashboard` zeigt PR/PO-Status, gefiltert nach `tenantId`, mit Budget-Badge.
- `PoApprovalPanel` für Vier-Augen-Entscheidung; schreibt nur via Approve-API.
- `SupplierQuoteCompare` rendert Angebotsvergleich aus paginierter API.
- Komponenten unter `src/modules/commerce/procurement/ui/`, nur v1-APIs.

## Kapitel 8 – Tests

- Unit (Vitest): Budget-Prüf-Logik, Vier-Augen-Regel, Angebotsauswahl.
- Integration: PR → PO → Freigabe → Event zu Band 48; Tenant-Isolation verifiziert.
- Security: Scope-Verweigerung, verschlüsselte Beträge, Cross-Tenant blockiert.
- Fehlerpfade: Budget-Überschreitung, doppelte Freigabe, ungültige PR.

## Kapitel 9 – Security

- Auth über Core (keine zweite); Autorisierung via `requireApiPermission` (`procurement:read`, `procurement:write`).
- Tenant-Isolation durchgehend; Bestellbeträge verschlüsselt, nie in Logs/Prompts.
- Audit über Band-10 für Freigabe-Entscheidungen; Vier-Augen-Prinzip erzwungen.

## Kapitel 10 – Performance

- Indizes auf `(tenantId, approvalState)`, `(tenantId, supplierId)`, `(tenantId, prId)`.
- Budget-Check asynchron gecached; List-Queries mit Cursor, p95 < 200 ms.
- Bulk-PO-Erzeugung batchweise; keine N+1 bei Lieferanten-Angeboten.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines, keine Core-Fork.
7. Tenant-Isolation-Test grün. 8. Encryption-Verifizierung Bestellbeträge.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
