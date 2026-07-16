# CarryOS Universe – Band 49
# Masterprompt: Marketplace (VOLLSTÄNDIG)

> Band: 49 | Masterprompt: 49.0 | Status: PLANNED | Gruppe: Commerce & Sales
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork erlaubt

> Hinweis: Fachmodul baut ohne Fork auf CarryOS Core auf. Listing, Katalog und Order-Routing; Zahlung/Settlement über Band 14.

## Kapitel 1 – Architektur

- Marketplace-Modul als Package `src/modules/commerce/marketplace/`; keine eigene Runtime, DB oder Queue.
- Listing, Offer und Marketplace-Order sind fachliche Aggregate über Core-Repository mit `tenantId`-Filter.
- Settlement und Gebühren delegieren an Band 14; dieses Modul speichert nur verschlüsselte Beträge.
- Nutzt Band-11-Agenten für Katalog-Sync und Preis-Empfehlung.

## Kapitel 2 – Datenmodelle

- Entität `MarketplaceListing` (id, tenantId, channel, sku, titleEnc, priceEnc, currency, status) – Angebotseintrag.
- Entität `MarketplaceOrder` (id, tenantId, channel, externalOrderRefEnc, buyerHash, totalEnc, status) – Marktplatz-Bestellung.
- Entität `MarketplacePayout` (id, tenantId, period, grossEnc, feeEnc, netEnc, status) – Abrechnung (Band 14).
- Entität `ChannelConfig` (id, tenantId, channel, apiRefEnc, enabled) – Kanal-Verbindung (Ref, kein Secret).
- Alle Modelle zwingend `tenantId`; Schema nur im Commerce-Namespace.

## Kapitel 3 – APIs

- `POST /api/v1/commerce/marketplace/listings` – Listing anlegen; Zod `listingSchema`, Envelope.
- `GET /api/v1/commerce/marketplace/orders?channel=` – Bestellungen, paginiert, tenant-isoliert.
- `POST /api/v1/commerce/marketplace/orders/:id/fulfill` – Fulfillment; `marketplace.order.placed.v1`.
- `GET /api/v1/commerce/marketplace/payouts?period=` – Abrechnung (Band 14 Daten).
- `PATCH /api/v1/commerce/marketplace/listings/:id/price` – Preis-Update durch Agent.

## Kapitel 4 – Events

- `marketplace.listing.published.v1` – nach Listing; konsumiert von Kanal-Sync.
- `marketplace.order.placed.v1` – bei Bestellung; konsumiert von Band 46 (Reservierung) + Band 14.
- `marketplace.order.shipped.v1` – bei Versand; konsumiert von Band 47.
- `marketplace.payout.settled.v1` – nach Settlement; konsumiert von Band 14.
- Events versioniert über Outbox; Beträge nur verschlüsselt im Payload.

## Kapitel 5 – Workflows

- Listing: ApiContext → Zod → requireApiPermission(marketplace:write) → MarketplaceService → Repository → Outbox → Envelope.
- Order: Consume Kanal-Webhook → `MarketplaceOrder` → `marketplace.order.placed.v1` → Reservierung; idempotent via externalRef.
- Payout: Band-14-Event → `MarketplacePayout` → `marketplace.payout.settled.v1`; keine Logik im Handler.

## Kapitel 6 – Agenten

- `CatalogSyncAgent`: synchronisiert Listings zu `ChannelConfig` (Ref-basiert).
- `PriceAgent`: empfiehlt Preis aus Wettbewerb und Bestand.
- `OrderRoutingAgent`: leitet Bestellung an Lager/Logistik weiter.
- Registrierung in Band-11-Runtime; Kanal-Integration nur über Band 15/68.

## Kapitel 7 – UI

- `MarketplaceListingGrid` zeigt Listings je Kanal, gefiltert nach `tenantId`.
- `MarketplaceOrderBoard` rendert Bestellungen aus paginierter API.
- `PayoutSummary` zeigt Settlement (decrypted server-seitig); reine Darstellung.
- Komponenten unter `src/modules/commerce/marketplace/ui/`, nur v1-APIs.

## Kapitel 8 – Tests

- Unit (Vitest): Preis-Update-Logik, Order-Idempotenz, Payout-Aggregation.
- Integration: Kanal-Webhook → Order → Reservierung; Tenant-Isolation verifiziert.
- Security: Scope-Verweigerung, verschlüsselte Beträge, Cross-Tenant blockiert.
- Fehlerpfade: Duplikat-Order, ungültiger Kanal, abgelaufenes Listing.

## Kapitel 9 – Security

- Auth über Core (keine zweite); Autorisierung via `requireApiPermission` (`marketplace:read`, `marketplace:write`).
- Tenant-Isolation durchgehend; Käufer-Hash und Beträge verschlüsselt, nie in Logs.
- Channel-Secrets nur als `apiRefEnc`; Audit über Band-10 für alle Schreiboperationen.

## Kapitel 10 – Performance

- Indizes auf `(tenantId, channel, status)`, `(tenantId, externalOrderRefEnc)`.
- Listing-Sync asynchron gecached; Order-Queries mit Cursor, p95 < 200 ms.
- Webhook-Ingest idempotent; keine Blocking-Calls bei Kanal-Abfrage.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines, keine Core-Fork.
7. Tenant-Isolation-Test grün. 8. Encryption-Verifizierung Beträge + Buyer-Hash.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
