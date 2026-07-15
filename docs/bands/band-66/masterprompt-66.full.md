# CarryOS Universe – Band 66
# Masterprompt: Enterprise Licensing (VOLLSTÄNDIG)

> Band: 66 | Masterprompt: 66.0 | Status: PLANNED | Gruppe: Platform
> Abhängigkeit: Band 10–16 (Core), Band 14 (Finance OS), keine Core-Fork

## Kapitel 1 – Architektur

- Enterprise Licensing verwaltet mandantenfähige Lizenz- und Subscription-Verträge (`licenseGrant`) mit Feature-Flags, Seat-Limits und Modul-Bindings – gebaut auf Band 14 Finance OS als Billing-Quelle.
- License-Engine ist Policy-Layer über Core: zur Laufzeit prüft `requireLicense(feature)` die aktive Grant eines Tenants; keine eigene Finance-Engine.
- Lizenzen sind versioniert und auditierbar; Änderungen erzeugen immutable License-Revisionen.
- Bundling: ein Enterprise-Vertrag kann mehrere Bänder (Module) freischalten (z. B. Band 17 SHK Office).

## Kapitel 2 – Datenmodelle

- `LicenseGrant`: tenantId, planId, moduleIds[], seatLimit, featureFlags{}, validFrom, validTo, status.
- `LicenseRevision`: revisionId, grantId, changeSet, changedBy, changedAt (immutable Audit).
- `LicenseSeat`: tenantId, grantId, userId, assignedAt (enforced seatLimit).
- `LicenseEntitlement`: tenantId, featureKey, enabled, sourceGrantId (Runtime-Lookup).

## Kapitel 3 – APIs

- `GET /api/v1/licensing/grants` – aktive Grants eines Tenants (tenantIsolation, Band-10-Envelope).
- `POST /api/v1/licensing/grants` – Grant anlegen/verlängern (nur Finance-Role, requireApiPermission).
- `POST /api/v1/licensing/seats/assign` – Seat zuweisen mit Limit-Check.
- `GET /api/v1/licensing/entitlements` – Feature-Flags für Runtime-`requireLicense`.

## Kapitel 4 – Events

- `license.granted.v1`, `license.renewed.v1`, `license.seat_assigned.v1`, `license.expired.v1`, `license.feature_changed.v1`.
- Bei Billing: `finance.invoice_generated.v1` aus Band 14; bei Ablauf `license.expired.v1` → Feature-Revoke.
- Alle Events mit `tenantId`, `grantId`, `actorId`; schema-versioniert für Replay.

## Kapitel 5 – Workflows

- Grant-Flow: Vertrag (Band 14) → Grant-Erstellung → Revision-Write → Entitlement-Sync → ExecutionKey → ACTIVE.
- Seat-Flow: Assign → seatLimit-Check → Seat-Persist → `license.seat_assigned.v1` → UI-Update.
- Expire-Flow: Cron/Outbox → Validierungs-Check → Entitlement-Revoke → `license.expired.v1` → Module-Lock.

## Kapitel 6 – Agenten

- `LicenseComplianceAgent` (Band 11): überwacht Seat-Überbuchung, abgelaufene Grants, orphaned Entitlements.
- `EntitlementSyncAgent`: hält Runtime-Entitlements mit Grants konsistent (event-getrieben).
- `RenewalAgent`: prognostiziert Abläufe, triggert Band 14 Renewal-Offers.

## Kapitel 7 – UI

- License-Admin: Grants-Übersicht, Module-Matrix, Seat-Verwaltung, Ablauf-Warnungen.
- Entitlement-Dashboard: Feature-Flags live, Quelle pro Flag, Audit-Link.
- Billing-Integration-View: verknüpfte Band-14-Invoices, Renewal-Status.

## Kapitel 8 – Tests

- Vitest-Unit: seatLimit-Enforcement, featureFlag-Resolution, Revision-Immutability, Date-Validation.
- Integration: Grant→Entitlement→requireLicense Roundtrip; Tenant A Flags nicht in Tenant B wirksam.
- Security-Test: Seat-Überbuchung → Assign blockiert + `license.compliance_violation.v1`.

## Kapitel 9 – Security

- requireApiPermission nur für Finance-Role auf Grant-Mutationen; Lesen strikt tenantIsoliert.
- Entitlement-Lookup signiert/cached, Manipulation am Grant erzeugt neue Revision + Alert.
- Keine Secrets in Grants; Audit aller Mutationspfade (Band 76 Audit Center kompatibel).

## Kapitel 10 – Performance

- Entitlement-Check < 5ms (p95) via gecachetem Runtime-Map (TTL 30s, invalidiert bei Event).
- Seat-Assign < 50ms; Indizes auf (tenantId, grantId), (tenantId, featureKey).
- Cron-Validierung asynchron über Outbox, kein Sync-Blocking im Request-Pfad.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweite Finance-Engine.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
