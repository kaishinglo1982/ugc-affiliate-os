# CarryOS Universe – Band 48
# Masterprompt: Lieferantenportal (VOLLSTÄNDIG)

> Band: 48 | Masterprompt: 48.0 | Status: PLANNED | Gruppe: Commerce & Sales
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork erlaubt

> Hinweis: Fachmodul baut ohne Fork auf CarryOS Core auf. Externer Zugang für Lieferanten aus Band 45/46; eigene Auth-Rolle, kein Fork.

## Kapitel 1 – Architektur

- Lieferantenportal als Package `src/modules/commerce/supplier-portal/`; keine eigene Runtime, DB oder Queue.
- Supplier-Profile, Angebote und ASNs sind fachliche Aggregate über Core-Repository mit `tenantId` + `supplierId`-Filter.
- Externer Zugriff über bestehende Core-Auth mit Lieferanten-Rolle; keine zweite Authentifizierung.
- Nutzt Band-11-Agenten für Angebots-Validierung und ASN-Abgleich.

## Kapitel 2 – Datenmodelle

- Entität `SupplierProfile` (id, tenantId, supplierId, name, contactEnc, catalogRef, active) – Lieferantenstamm.
- Entität `SupplierOffer` (id, tenantId, supplierId, prId, linesJson, totalEnc, validUntil) – Angebot für PR.
- Entität `AdvanceShippingNotice` (id, tenantId, supplierId, poId, linesJson, etaAt) – ASN.
- Entität `SupplierInvoiceRef` (id, tenantId, supplierId, poId, invoiceRefEnc, status) – Rechnungs-Ref (Band 14).
- Alle Modelle zwingend `tenantId` + `supplierId`; Schema nur im Commerce-Namespace.

## Kapitel 3 – APIs

- `POST /api/v1/commerce/supplier/offers` – Angebot zu PR; Zod `supplierOfferSchema`, Envelope.
- `POST /api/v1/commerce/supplier/asn` – ASN zu PO; `supplier.asn.submitted.v1`.
- `GET /api/v1/commerce/supplier/orders?status=` – PO-Sicht für Lieferant, tenant+supplier-isoliert.
- `POST /api/v1/commerce/supplier/invoice-refs` – Rechnungs-Ref; delegiert an Band 14.
- `GET /api/v1/commerce/supplier/profile` – eigenes Profil (Lieferanten-Rolle).

## Kapitel 4 – Events

- `supplier.offer.submitted.v1` – nach Angebot; konsumiert von Band 45 (Vergleich).
- `supplier.asn.submitted.v1` – nach ASN; konsumiert von Band 46/47 (Wareneingang).
- `supplier.invoice.registered.v1` – nach Rechnungs-Ref; konsumiert von Band 14.
- `supplier.po.assigned.v1` – bei PO-Zuweisung; Notification an Lieferant.
- Events versioniert über Outbox; Beträge nur verschlüsselt im Payload.

## Kapitel 5 – Workflows

- Angebot: ApiContext (Supplier-Role) → Zod → requireApiPermission(supplier:write) → PortalService → Repository → Outbox → Envelope.
- ASN: Service → `AdvanceShippingNotice` → `supplier.asn.submitted.v1`; idempotent via PO-Id.
- Rechnungs-Ref: Service → Band-14-Event → `supplier.invoice.registered.v1`; keine Logik im Handler.

## Kapitel 6 – Agenten

- `SupplierOfferAgent`: validiert Angebot gegen PR und flaggt Abweichungen.
- `AsnMatchAgent`: gleicht ASN mit PO-Positionen ab und meldet Differenzen.
- `SupplierScoreAgent`: bewertet Lieferzuverlässigkeit aus ASN/Invoice-Historie.
- Registrierung in Band-11-Runtime; bestehende Tool-Schnittstellen.

## Kapitel 7 – UI

- `SupplierOfferForm` für Angebotserfassung, isoliert nach `supplierId`.
- `SupplierAsnView` zeigt zugewiesene POs und ASN-Abgabe; schreibt nur via APIs.
- `SupplierScorecard` rendert Score aus paginierter API; reine Darstellung.
- Komponenten unter `src/modules/commerce/supplier-portal/ui/`, nur v1-APIs.

## Kapitel 8 – Tests

- Unit (Vitest): Angebots-Validierung, ASN-Abgleich, Score-Berechnung.
- Integration: PR → Lieferant-Angebot → PO; Tenant+Supplier-Isolation verifiziert.
- Security: Supplier-Role-Verweigerung, Cross-Supplier blockiert, verschlüsselte Beträge.
- Fehlerpfade: ungültige PR, abgelaufenes Angebot, falsche PO-Zuweisung.

## Kapitel 9 – Security

- Auth über Core (keine zweite); Autorisierung via Lieferanten-Rolle + `requireApiPermission`.
- Tenant- und Supplier-Isolation durchgehend; Beträge verschlüsselt, nie in Logs.
- Audit über Band-10 für alle Lieferanten-Schreiboperationen.

## Kapitel 10 – Performance

- Indizes auf `(tenantId, supplierId, prId)`, `(tenantId, supplierId, poId)`.
- Angebots- und ASN-Queries gecached; List mit Cursor, p95 < 200 ms.
- Bulk-ASN batchweise; keine N+1 bei PO-Positionen.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines, keine Core-Fork.
7. Tenant+Supplier-Isolation-Test grün. 8. Encryption-Verifizierung Beträge.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
