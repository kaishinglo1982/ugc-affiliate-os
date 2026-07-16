# CarryOS Universe – Band 72
# Masterprompt: IAM & SSO (VOLLSTÄNDIG)

> Band: 72 | Masterprompt: 72.0 | Status: PLANNED | Gruppe: Enterprise
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

## Kapitel 1 – Architektur

Beschreibt die IAM/SSO-Schichten. Bestehendes `src/lib/auth` wird erweitert – KEINE zweite Authentifizierung.

- Thema: Zentrales Identity & Access Management mit SSO-Föderation auf Basis von `src/lib/auth/session.ts`, `rbac.ts`, `tenant.ts`.
- SSO-Provider-Anbindung (OIDC/SAML) als Adapter in `src/lib/auth/sso/`, registriert im bestehenden Login-Flow (`src/app/(auth)`).
- RBAC-Modell in `rbac.ts` wird um Roles, Groups, Conditional Access erweitert – kein zweites Auth-System.
- Session-Föderation: SSO-Login erzeugt CarryOS-Session über `session.ts`; Logout propagiert an IdP (SLO).
- Provisioning: SCIM-Inbound für User/Groups aus Enterprise-IdPs, tenant-isoliert.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `SsoConnection`: tenantId, provider (oidc/saml), config (encrypted), domain, active.
- `IdentityProviderUser`: tenantId, idpSubject, carryUserId, connectionId, lastLoginAt.
- `Role` / `Group` / `UserRole`: tenantId, name, permissions[], inherits[].
- `ConditionalAccessPolicy`: tenantId, conditions (ip/device/mfa), effect.
- Alle Entitäten erben Tenant-Muster aus `tenant.ts`; Fremdschlüssel zu bestehenden User-Tabellen.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `POST /api/v1/iam/sso/connections` – SSO-Verbindung konfigurieren (Zod `SsoConnectionInput`).
- `POST /api/v1/iam/sso/callback` – IdP-Callback → Session-Erstellung via `session.ts`.
- `GET /api/v1/iam/roles` / `POST /api/v1/iam/roles` – Rollenverwaltung.
- `POST /api/v1/iam/groups/:id/members` – Gruppenmitgliedschaft (SCIM-kompatibel).
- `GET /api/v1/iam/conditional-access` – Policies lesen/prüfen.
- Alle Endpunkte nutzen `requireApiPermission` und `withApiContext`; keine eigene Auth.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `iam.sso.connection.created.v1` – neue IdP-Verbindung.
- `iam.user.provisioned.v1` – SCIM-Inbound User-Anlage.
- `iam.role.assigned.v1` – Rollen-/Gruppenzuweisung geändert.
- `iam.conditional_access.denied.v1` – Zugriff blockiert durch CA-Policy.
- Consumer: Audit Center (76), Security (71), Observability (78).

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- SSO-Login: IdP-Redirect → Callback → `session.ts` Session → `IdentityProviderUser`-Link → Event.
- Provisioning: SCIM-Payload → Validation → User/Group-Upsert (idempotent) → `iam.user.provisioned.v1`.
- Access-Check: Request → `rbac.ts` + `ConditionalAccessPolicy` → Allow/Deny → Audit.
- Role-Change: Mutation → Re-Evaluation aktiver Sessions → Event → Audit.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `iam-governance` Agent: erkennt Orphan-Accounts, überprivilegierte Rollen, Policy-Drift.
- `access-reviewer` Agent: generiert periodische Access-Reviews (Certification-Campaigns).
- Registrierung in Band-11-Runtime; kein eigener Loop.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- `src/app/app/iam` Konsole: SSO-Verbindungen, Rollen/Group-Editor, CA-Policies.
- Login-Flow-Erweiterung in `src/app/(auth)` um IdP-Auswahl (kein Fork des Flows).
- Access-Review-Dashboard mit Certification-Tasks; Logik serverseitig via `rbac.ts`.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: `rbac.ts` Permission-Resolution, SSO-Adapter-Token-Validation, CA-Policy-Auswertung.
- Integration: SSO-Callback → Session → Rollen korrekt angewendet.
- Security-Test: Cross-Tenant SSO-Verbindung nicht zugreifbar; Session nicht über Tenant-Grenze.
- Negative: abgelehnte CA-Policy liefert 403, kein Fallback-Login.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- AuthN ausschließlich über `session.ts` + SSO-Adapter; KEINE zweite Auth-Implementierung.
- AuthZ via `rbac.ts`; Tenant-Isolation via `tenant.ts` bei allen IAM-Queries.
- IdP-Secrets (Client-Secret) im Vault, referenziert nicht im Code; niemals in Logs.
- MFA/Step-up über ConditionalAccess; SLO invalidiert CarryOS-Session zentral.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `SsoConnection(tenantId, domain)`, `IdentityProviderUser(tenantId, idpSubject)`.
- RBAC-Permission-Cache pro (tenantId, userId): p95 < 3ms; Invalidation bei Role-Change.
- SSO-Callback asynchron sessionisiert; Token-Validation lokal gecached (JWKS).
- SCIM-Bulk-Provisioning batch-orientiert, nicht blockierend.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweite Auth/Engine.
7. Security-Test: Cross-Tenant-IAM-Block bestanden.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
