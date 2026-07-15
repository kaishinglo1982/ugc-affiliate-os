# CarryOS Universe – Band 62
# Masterprompt: Plugin Marketplace (VOLLSTÄNDIG)

> Band: 62 | Masterprompt: 62.0 | Status: PLANNED | Gruppe: Platform
> Abhängigkeit: Band 10–16 (Core), Band 61 (Plugin SDK), keine Core-Fork

## Kapitel 1 – Architektur

- Marketplace ist ein Catalog-Service, der Plugin-Artefakte aus Band 61 als versionierte Listings (`pluginListing`) publiziert – Storage über bestehenden Object-Store, Metadaten in Core-DB.
- Listing-Index ist read-optimiert, tenant-übergreifend lesbar (Public Catalog), Installation bleibt aber strikt tenant-isoliert in Band 61.
- Review-Pipeline nutzt Band 11 Agenten zur automatischen Manifest- und Sicherheitsprüfung vor Publishing.
- Keine eigene Commerce-Engine; Abrechnung delegiert an Band 14 Finance OS via Event.

## Kapitel 2 – Datenmodelle

- `PluginListing`: listingId, pluginId, version, title, description, category, priceModel (FREE|PAID|SUBSCRIPTION), rating, reviewState.
- `PluginReview`: listingId, reviewerAgentId|userId, verdict (APPROVED|REJECTED), findings[], riskScore.
- `PluginPurchase`: tenantId, listingId, planId, status, nextBillingAt (verweist auf Band 14).
- `PluginPublisher`: publisherId, orgName, verified, tenantId (Isolation der Publisher-Verwaltung).

## Kapitel 3 – APIs

- `GET /api/v1/marketplace/listings` – gefiltert nach Kategorie/Version, Public-Catalog (Band-10-Envelope).
- `GET /api/v1/marketplace/listings/:id` – Detail inkl. Capability-Matrix aus Band 61 Manifest.
- `POST /api/v1/marketplace/listings` – Publishing (Publisher-Auth + requireApiPermission).
- `POST /api/v1/marketplace/:id/acquire` – Installation in eigenen Tenant triggern (ruft Band 61).

## Kapitel 4 – Events

- `marketplace.listing_published.v1`, `marketplace.listing_reviewed.v1` (mit verdict), `marketplace.acquired.v1`.
- Bei Kauf: `finance.subscription_requested.v1` an Band 14; bei Rückerstattung `finance.refund_requested.v1`.
- Alle Events mit `tenantId`, `listingId`, `actorId`; versioniertes Schema für Replay.

## Kapitel 5 – Workflows

- Publish-Flow: Upload → Manifest-Ingest (Band 61) → `PluginReviewAgent` (Band 11) → riskScore → APPROVED/REJECTED → Listing sichtbar/verborgen.
- Acquire-Flow: Auswahl → Capability-Check → Band 61 install → Band 14 billing → `marketplace.acquired.v1` → Dashboard-Update.
- Moderation-Flow: User-Report → Re-Review → ggf. Listing-Suspension mit Audit-Trail.

## Kapitel 6 – Agenten

- `MarketplaceReviewAgent` (Band 11): prüft Manifest, Capabilities, Sandbox-Konformität, Risiko-Score.
- `CatalogSearchAgent`: semantische Suche/Ranking über Listings für Tenant-User.
- `FraudDetectionAgent`: erkennt verdächtige Publisher/Bewertungs-Muster.

## Kapitel 7 – UI

- Marketplace-Browse: Kategorien, Filter, Rating, Capability-Badges, "Install"-CTA.
- Publisher-Portal: Listing erstellen/bearbeiten, Versionen, Analytics, Review-Status.
- Plugin-Detailseite: Manifest-Vorschau, Berechtigungs-Matrix, Preismodell, Reviews.

## Kapitel 8 – Tests

- Vitest-Unit: Rating-Aggregation, priceModel-Validierung, riskScore-Berechnung.
- Integration: Publish→Review→Acquire Roundtrip; Tenant A sieht gekaufte Plugins nicht in Tenant B.
- Security-Test: Unverifizierter Publisher mit `core.*` Capability → REJECTED durch ReviewAgent.

## Kapitel 9 – Security

- Publisher-Verification via Org-Identity (Band 72 später), Signaturpflicht für Artefakte.
- Capability-Allowlist-Durchsetzung aus Band 61; keine `core.admin`-Capabilities im Public-Catalog erlaubt.
- requireApiPermission auf Publish/Acquire; Audit aller Reviews und Suspensionen.

## Kapitel 10 – Performance

- Catalog-Index über Such-Indizes (Kategorie, Rating, Version); Listings paginiert + CDN-cached.
- Search p95 < 100ms; Acquire-Trigger < 300ms (async Installation in Band 61).
- Indizes auf (category, rating), (publisherId, listingId); Read-Replicas für Catalog-Reads.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines/Commerce.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
