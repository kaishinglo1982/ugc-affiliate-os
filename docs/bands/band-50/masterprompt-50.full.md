# CarryOS Universe – Band 50
# Masterprompt: White-Label Commerce (VOLLSTÄNDIG)

> Band: 50 | Masterprompt: 50.0 | Status: PLANNED | Gruppe: Commerce & Sales
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork erlaubt

> Hinweis: Fachmodul baut ohne Fork auf CarryOS Core auf. Branding-, Domain- und Tenant-Template-Schicht über alle Commerce-Bänder 41–49.

## Kapitel 1 – Architektur

- White-Label-Modul als Package `src/modules/commerce/white-label/`; keine eigene Runtime, DB oder Queue.
- Brand, Theme, Custom-Domain und Checkout-Template sind fachliche Aggregate über Core-Repository mit `tenantId`-Filter.
- Rendering nutzt bestehende UI-Komponenten der Bänder 41–49, nur mit Brand-Override; kein Fork der Commerce-Logik.
- Nutzt Band-11-Agenten für Theme-Generierung und Brand-Konsistenz-Prüfung.

## Kapitel 2 – Datenmodelle

- Entität `BrandProfile` (id, tenantId, brandNameEnc, logoRef, primaryColor, domainEnc, active) – Marken-Profil.
- Entität `ThemeConfig` (id, tenantId, brandId, tokensJson, layoutJson) – Design-Tokens/Layout.
- Entität `CustomDomain` (id, tenantId, domainEnc, verified, sslState) – eigene Domain.
- Entität `CheckoutTemplate` (id, tenantId, brandId, stepsJson, locale) – White-Label-Checkout.
- Alle Modelle zwingend `tenantId`; Schema nur im Commerce-Namespace.

## Kapitel 3 – APIs

- `POST /api/v1/commerce/white-label/brands` – Brand anlegen; Zod `brandProfileSchema`, Envelope.
- `PATCH /api/v1/commerce/white-label/brands/:id/theme` – Theme setzen; `white-label.theme.updated.v1`.
- `POST /api/v1/commerce/white-label/domains` – Domain registrieren; `white-label.domain.added.v1`.
- `GET /api/v1/commerce/white-label/storefront?brandId=` – Storefront-Konfig, tenant-isoliert.
- `POST /api/v1/commerce/white-label/checkout/templates` – Checkout-Template; `white-label.checkout.updated.v1`.

## Kapitel 4 – Events

- `white-label.brand.created.v1` – nach Brand; aktiviert Storefront-Rendering.
- `white-label.theme.updated.v1` – bei Theme-Wechsel; invalidiert Frontend-Cache.
- `white-label.domain.added.v1` – bei Domain-Registrierung; konsumiert von Band 15 (Routing).
- `white-label.checkout.updated.v1` – bei Template-Änderung; für Storefront-Consumer.
- Events versioniert über Outbox; Domains/Brand nur verschlüsselt im Payload.

## Kapitel 5 – Workflows

- Brand-Erstellung: ApiContext → Zod → requireApiPermission(white-label:write) → WhiteLabelService → Repository → Outbox → Envelope.
- Theme-Apply: Service → `ThemeConfig` → Cache-Invalidierung → Event; idempotent via Brand-Id.
- Domain-Registrierung: Service → `CustomDomain` → `white-label.domain.added.v1` → Band 15 Routing; keine Logik im Handler.

## Kapitel 6 – Agenten

- `ThemeAgent`: generiert `tokensJson` aus Brand-Vorgabe (Farbe/Logo).
- `BrandConsistencyAgent`: prüft Storefront/Checkout gegen `ThemeConfig`.
- `DomainAgent`: überwacht SSL/Verification-Status der `CustomDomain`.
- Registrierung in Band-11-Runtime; bestehende Tool-Schnittstellen.

## Kapitel 7 – UI

- `BrandStudio` konfiguriert Brand/Theme, isoliert nach `tenantId`.
- `DomainManager` verwaltet `CustomDomain` (Enc-Wert, Status); schreibt nur via APIs.
- `StorefrontPreview` rendert Bänder 41–49 mit Brand-Override; reine Darstellung.
- Komponenten unter `src/modules/commerce/white-label/ui/`, nur v1-APIs.

## Kapitel 8 – Tests

- Unit (Vitest): Theme-Token-Merge, Domain-Validation, Checkout-Schritte-Logik.
- Integration: Brand → Theme → Storefront-Render; Tenant-Isolation verifiziert.
- Security: Scope-Verweigerung, verschlüsselte Domain/Brand, Cross-Tenant blockiert.
- Fehlerpfade: ungültige Domain, fehlendes Logo, doppelte Brand.

## Kapitel 9 – Security

- Auth über Core (keine zweite); Autorisierung via `requireApiPermission` (`white-label:read`, `white-label:write`).
- Tenant-Isolation durchgehend; Domain und Brand-Name verschlüsselt, nie in Logs.
- Audit über Band-10 für Brand-/Theme-/Domain-Änderungen; keine Secrets im Client.

## Kapitel 10 – Performance

- Indizes auf `(tenantId, brandId)`, `(tenantId, domainEnc)`.
- Theme-Cache pro Brand, invalidiert via Event; Storefront p95 < 250 ms.
- Domain-Lookup asynchron gecached; keine N+1 bei Template-Resolution.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines, keine Core-Fork.
7. Tenant-Isolation-Test grün. 8. Encryption-Verifizierung Domain/Brand.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
