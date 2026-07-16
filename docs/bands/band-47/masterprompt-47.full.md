# CarryOS Universe – Band 47
# Masterprompt: Logistik (VOLLSTÄNDIG)

> Band: 47 | Masterprompt: 47.0 | Status: PLANNED | Gruppe: Commerce & Sales
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork erlaubt

> Hinweis: Fachmodul baut ohne Fork auf CarryOS Core auf. Konsumiert Reservierungen aus Band 46; Tracking über bestehende Integrationen.

## Kapitel 1 – Architektur

- Logistikmodul als Package `src/modules/commerce/logistics/`; keine eigene Runtime, DB oder Queue.
- Shipment, Route und Tracking sind fachliche Aggregate über Core-Repository mit `tenantId`-Filter.
- Carrier-Anbindung nur über bestehende Integrations-Schicht (Band 15/68); kein eigener Provider-Code mit Secrets.
- Nutzt Band-11-Agenten für Routen-Optimierung und Zustell-Prognose.

## Kapitel 2 – Datenmodelle

- Entität `Shipment` (id, tenantId, warehouseId, carrierRef, status, weightKg, trackingNoEnc, etaAt) – Sendung.
- Entität `ShipmentLine` (id, tenantId, shipmentId, sku, quantity) – ausgelieferte Positionen.
- Entität `TrackingEvent` (id, tenantId, shipmentId, status, occurredAt, locationEnc) – Status-Historie.
- Entität `CarrierConfig` (id, tenantId, carrier, apiRefEnc, enabled) – Carrier-Verbindung (Ref, kein Secret).
- Alle Modelle zwingend `tenantId`; Schema nur im Commerce-Namespace.

## Kapitel 3 – APIs

- `POST /api/v1/commerce/logistics/shipments` – Sendung aus Reservierung; Zod `shipmentCreateSchema`, Envelope.
- `GET /api/v1/commerce/logistics/shipments/:id/tracking` – Tracking-Verlauf, tenant-isoliert.
- `POST /api/v1/commerce/logistics/shipments/:id/events` – Status-Event; `logistics.tracking.updated.v1`.
- `GET /api/v1/commerce/logistics/carriers` – konfigurierte Carrier (Ref, kein Secret).
- `PATCH /api/v1/commerce/logistics/shipments/:id/eta` – ETA-Update durch Agent.

## Kapitel 4 – Events

- `logistics.shipment.created.v1` – nach Sendungserzeugung; konsumiert `inventory.reserved.v1`.
- `logistics.tracking.updated.v1` – bei Status-Wechsel; für Kunde/Marketplace (Band 49).
- `logistics.delivered.v1` – bei Zustellung; konsumiert von Band 43 (CS) und Band 49.
- `logistics.exception.v1` – bei Störung; triggert Agent-Eskalation.
- Events versioniert über Outbox; Tracking-Nummer nur verschlüsselt im Payload.

## Kapitel 5 – Workflows

- Sendungserzeugung: Consume `inventory.reserved.v1` → ShipmentService.create → Repository → Outbox → Envelope.
- Tracking-Update: Service → `TrackingEvent` append → Status-Propagierung → Event; idempotent via Event-Ref.
- ETA-Prognose: Band-11-Agent → Carrier-Daten → `PATCH eta`; keine Logik im Handler.

## Kapitel 6 – Agenten

- `RouteOptimizerAgent`: wählt Carrier/Route nach Gewicht, Ziel und Kosten.
- `EtaAgent`: prognostiziert Zustellzeit aus Tracking-Historie.
- `LogisticsExceptionAgent`: erkennt `logistics.exception.v1` und eskaliert.
- Registrierung in Band-11-Runtime; Integration nur über Band 15/68.

## Kapitel 7 – UI

- `ShipmentBoard` zeigt Sendungen je Status, gefiltert nach `tenantId`.
- `TrackingTimeline` rendert `TrackingEvent`-Verlauf aus paginierter API.
- `CarrierConfigView` verwaltet Carrier-Refs (kein Secret im Client).
- Komponenten unter `src/modules/commerce/logistics/ui/`, nur v1-APIs.

## Kapitel 8 – Tests

- Unit (Vitest): Status-Übergänge, ETA-Berechnung, Exception-Erkennung.
- Integration: Reservierung → Sendung → Tracking-Event; Tenant-Isolation verifiziert.
- Security: Scope-Verweigerung, verschlüsselte Tracking-No, Cross-Tenant blockiert.
- Fehlerpfade: ungültige Reservierung, Carrier-Fehler, fehlendes Gewicht.

## Kapitel 9 – Security

- Auth über Core (keine zweite); Autorisierung via `requireApiPermission` (`logistics:read`, `logistics:write`).
- Tenant-Isolation durchgehend; Tracking-Nummer und Ort verschlüsselt.
- Carrier-Secrets liegen nie in Code/Logs/Docs; nur `apiRefEnc` in DB.

## Kapitel 10 – Performance

- Indizes auf `(tenantId, status, etaAt)`, `(tenantId, shipmentId, occurredAt)`.
- Tracking-Events append-only; Board-Queries mit Cursor, p95 < 200 ms.
- Carrier-Abfragen asynchron gecached; keine Blocking-Calls in Handlern.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines, keine Core-Fork.
7. Tenant-Isolation-Test grün. 8. Secret-Ref-Verifizierung (kein Klartext-Secret).

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
