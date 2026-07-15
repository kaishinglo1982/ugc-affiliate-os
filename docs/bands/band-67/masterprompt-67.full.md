# CarryOS Universe – Band 67
# Masterprompt: API Marketplace (VOLLSTÄNDIG)

> Band: 67 | Masterprompt: 67.0 | Status: PLANNED | Gruppe: Platform
> Abhängigkeit: Band 10–16 (Core), Band 10 (API Governance), keine Core-Fork

## Kapitel 1 – Architektur

- API Marketplace exponiert interne und Partner-APIs als versionierte, dokumentierte Produkte (`apiProduct`) mit Quota, Rate-Limit und Monetarisierung – gebaut auf Band 10 API-Governance (Envelope, withApiContext).
- API-Gateway-Layer registriert API-Produkte; Routing, Auth und Metering laufen über bestehende Core-Middleware, keine zweite Gateway-Engine.
- API-Produkte deklarieren Schema (OpenAPI-Import aus Band 10 Contracts), Pricing-Tier und Consumer-Scopes.
- Consumer erhalten API-Keys/Tokens, die an tenantId + apiProductId gebunden sind (Isolation).

## Kapitel 2 – Datenmodelle

- `ApiProduct`: productId, version, openApiRef, pricingTier (FREE|PAID|ENTERPRISE), quotaPerTier{}, ownerTenantId.
- `ApiSubscription`: tenantId, productId, tier, apiKeyHash, status, rateLimitOverride.
- `ApiUsageMeter`: tenantId, subscriptionId, period, requestCount, quotaUsed (für Band 14 Billing).
- `ApiKeyGrant`: tenantId, subscriptionId, keyHash, scopes[], expiresAt (Least Privilege).

## Kapitel 3 – APIs

- `GET /api/v1/api-marketplace/products` – Katalog (Public-lesbar, Band-10-Envelope).
- `POST /api/v1/api-marketplace/products/:id/subscribe` – Subscription + Key-Issuance.
- `GET /api/v1/api-marketplace/usage` – Metering-Daten pro Tenant.
- `POST /api/v1/gateway/:productId/*` – Proxy-Route über Core-Middleware mit Quota-Enforcement.

## Kapitel 4 – Events

- `api_product.published.v1`, `api_subscription.created.v1`, `api_quota.exceeded.v1`, `api_usage.metered.v1`.
- Metering emittiert `finance.usage_recorded.v1` an Band 14 für nutzungsbasierte Abrechnung.
- Alle Events mit `tenantId`, `subscriptionId`, `productId`, `actorId`; versioniert.

## Kapitel 5 – Workflows

- Publish-Flow: OpenAPI-Import (Band 10) → Schema-Validate → Tier-Def → Gateway-Register → ExecutionKey → PUBLISHED.
- Subscribe-Flow: Tier-Wahl → Quota-Allokation → Key-Issue (Hash) → Band 14 Billing-Link → ACTIVE.
- Quota-Flow: Middleware zählt Requests → `api_usage.metered.v1` → bei Limit `api_quota.exceeded.v1` → Throttle.

## Kapitel 6 – Agenten

- `ApiGovernanceAgent` (Band 11): prüft OpenAPI-Konformität, Versionierung, Deprecation-Policy.
- `QuotaEnforcementAgent`: überwacht Metering, warnt bei Anomalien (Burst/Abuse).
- `PartnerOnboardingAgent`: validiert externe API-Provider, signiert deren Schemas.

## Kapitel 7 – UI

- API-Katalog: Produktkarten, OpenAPI-Preview, Tier-Preise, "Subscribe".
- Developer-Portal: Key-Management, Usage-Charts, Quota-Fortschritt, Rate-Limit-Status.
- Provider-Portal: API-Produkt veröffentlichen, Schema-Upload, Analytics.

## Kapitel 8 – Tests

- Vitest-Unit: OpenAPI-Parse, Quota-Math, Tier-Resolution, Key-Hash-Verifikation.
- Integration: Subscribe→Proxy-Call→Meter Roundtrip; Tenant A Key nicht für Tenant B Product gültig.
- Security-Test: Unsigniertes Schema → Rejected; Key ohne Scope → 403 im Gateway.

## Kapitel 9 – Security

- API-Keys nur als Hash gespeichert; niemals Plaintext in DB/Logs/Docs.
- Scopes via Band 10 Allowlist; Gateway erzwingt tenantId-Bindung pro Subscription.
- requireApiPermission auf Publish/Subscribe; Audit aller Key-Issuances und Quota-Events.

## Kapitel 10 – Performance

- Gateway-Proxy p95 < 30ms Overhead über bestehende Middleware; Quota-Check < 2ms via In-Memory Counter.
- Usage-Meter asynchron (Outbox-Batch), Indizes auf (tenantId, subscriptionId, period).
- OpenAPI-Validation gecached pro productVersion, kein Re-Parse pro Request.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweite Gateway-Engine.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
