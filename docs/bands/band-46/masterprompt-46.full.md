# CarryOS Universe – Band 46
# Masterprompt: Lager (VOLLSTÄNDIG)

> Band: 46 | Masterprompt: 46.0 | Status: PLANNED | Gruppe: Commerce & Sales
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork erlaubt

> Hinweis: Fachmodul baut ohne Fork auf CarryOS Core auf. Bestandsführung für Einkauf (Band 45) und Logistik (Band 47).

## Kapitel 1 – Architektur

- Lagermodul als Package `src/modules/commerce/inventory/`; keine eigene Runtime, DB oder Queue.
- Lager, Lagerplatz, Bestand und Buchung sind fachliche Aggregate über Core-Repository mit `tenantId`-Filter.
- Bestandsbewegungen sind immutable Events; Konsistenz über Outbox sichergestellt, nicht über eigene Engine.
- Nutzt Band-11-Agenten für Nachbestell-Vorschlag und Inventurdifferenz-Erkennung.

## Kapitel 2 – Datenmodelle

- Entität `Warehouse` (id, tenantId, name, locationEnc, type) – Lagerstandort.
- Entität `StockItem` (id, tenantId, warehouseId, sku, quantityOnHand, quantityReserved, reorderPoint, unit) – Bestandsdatensatz.
- Entität `StockMovement` (id, tenantId, stockItemId, type, delta, reason, refDoc, occurredAt) – immutable Buchung.
- Entität `InventoryCount` (id, tenantId, warehouseId, countedAt, diffJson) – Inventur-Ergebnis.
- Alle Modelle zwingend `tenantId`; Schema nur im Commerce-Namespace.

## Kapitel 3 – APIs

- `POST /api/v1/commerce/inventory/movements` – Buchung (IN/OUT/ADJUST); Zod `stockMovementSchema`, Envelope.
- `GET /api/v1/commerce/inventory/items?warehouseId=` – Bestand, paginiert, tenant-isoliert.
- `POST /api/v1/commerce/inventory/counts` – Inventur; triggert `inventory.count.completed.v1`.
- `GET /api/v1/commerce/inventory/items/:sku/reorder` – Nachbestell-Vorschlag.
- `PATCH /api/v1/commerce/inventory/items/:id/reserve` – Reservierung für Auslieferung.

## Kapitel 4 – Events

- `inventory.movement.recorded.v1` – nach jeder Buchung; konsumiert von Band 47 (Logistik).
- `inventory.reorder.suggested.v1` – bei Unterschreitung `reorderPoint`; konsumiert von Band 45.
- `inventory.count.completed.v1` – nach Inventur; Differenz-Audit.
- `inventory.reserved.v1` – bei Reservierung; sperrt Menge für Auslieferung.
- Events versioniert über Outbox; Mengen als exakte Zahlen, keine Geldbeträge im Payload.

## Kapitel 5 – Workflows

- Buchung: ApiContext → Zod → requireApiPermission(inventory:write) → InventoryService.book → Repository (immutable Movement) → Outbox → Envelope.
- Reservierung: Service → `quantityReserved` Update (atomical) → `inventory.reserved.v1`; idempotent via Movement-Ref.
- Inventur: Service → `InventoryCount` → Diff-Anpassung Bestand → Event; keine Logik im Handler.

## Kapitel 6 – Agenten

- `ReorderAgent`: überwacht `reorderPoint` und erzeugt `inventory.reorder.suggested.v1`.
- `CycleCountAgent`: plantInventur-Termine und gleicht Soll/Ist ab.
- `StockAnomalyAgent`: erkennt unerklärte Bewegungen und flaggt für Audit.
- Registrierung in Band-11-Runtime; bestehende Tool-Schnittstellen.

## Kapitel 7 – UI

- `InventoryGrid` zeigt Bestand je Lager, gefiltert nach `tenantId`, mit Reorder-Flag.
- `MovementLog` rendert immutable Buchungen aus paginierter API.
- `CycleCountView` für Inventur-Erfassung; schreibt nur via Count-API.
- Komponenten unter `src/modules/commerce/inventory/ui/`, nur v1-APIs.

## Kapitel 8 – Tests

- Unit (Vitest): Reservierungs-Logik, Reorder-Berechnung, Diff-Ausgleich.
- Integration: Buchung → Event → Bestandsupdate; Tenant-Isolation verifiziert.
- Security: Scope-Verweigerung, Cross-Tenant blockiert, immutable Movement erzwungen.
- Fehlerpfade: negative Buchung über Bestand, doppelte Inventur, ungültiger SKU.

## Kapitel 9 – Security

- Auth über Core (keine zweite); Autorisierung via `requireApiPermission` (`inventory:read`, `inventory:write`).
- Tenant-Isolation durchgehend; Lagerort verschlüsselt (`locationEnc`).
- Audit über Band-10 für alle Buchungen und Inventuren; keine Manipulation nachträglich.

## Kapitel 10 – Performance

- Indizes auf `(tenantId, warehouseId, sku)`, `(tenantId, stockItemId, occurredAt)`.
- Bewegungen append-only; Bestand-Cache pro SKU, p95 < 150 ms.
- Bulk-Buchungen batchweise; keine N+1 bei Movement-Historie.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines, keine Core-Fork.
7. Tenant-Isolation-Test grün. 8. Immutability-Verifizierung Movement.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
