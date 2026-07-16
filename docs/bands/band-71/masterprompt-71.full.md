# CarryOS Universe – Band 71
# Masterprompt: Enterprise Security (VOLLSTÄNDIG)

> Band: 71 | Masterprompt: 71.0 | Status: PLANNED | Gruppe: Enterprise
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

## Kapitel 1 – Architektur

Beschreibt die Security-Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Bestehende Systeme in `src/lib/auth` werden erweitert, nicht dupliziert.

- Thema: Defense-in-Depth Security-Architektur, die `src/lib/auth` (session, rbac, rate-limit, tenant.ts) um Threat-Protection, Secret-Vault und Security-Header-Policies erweitert.
- Schichten: Edge (WAF/Rate-Limit via `rate-limit.ts`) → AuthN/AuthZ (`rbac.ts`, `require-user.ts`) → Tenant-Isolation (`tenant.ts`) → Applikations-Security → Daten-Verschlüsselung → Audit (`src/lib/audit/log.ts`).
- Kein eigener Security-Proxy: Nutzung der bestehenden Next.js-Middleware-Kette; neue Guards werden als Middleware-Module registriert.
- Security-Policies als versionierte Konfiguration in `src/lib/security/policy.ts` (tenant-aware), ausgewertet pro Request im `withApiContext`-Flow von Band 10.
- Threat-Modelle je Fachmodul: jedes Band ab 17 muss ein Security-Requirement-Dokument referenzieren; Band 71 definiert die Vorlage.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `SecurityPolicy`: tenantId, scope (module/band), rules (JSON, Zod-validiert), version, active.
- `SecretReference`: tenantId, keyName, vaultBackend, rotationAt, lastUsedAt (KEIN Klartext-Secret in DB).
- `ThreatEvent`: tenantId, severity, category, sourceIp, actorId, mitreTactic, detectedAt, status.
- `EncryptionKeyMeta`: tenantId, keyId, algorithm, purpose (data/backup/field), rotatedAt.
- Alle Tabellen erben das CarryOS-Tenant-Muster aus `src/lib/auth/tenant.ts`; Row-Level-Security-Hook wird im Repository-Layer erzwungen.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `POST /api/v1/security/policies` – Policy anlegen/aktualisieren (Zod-Schema `SecurityPolicyInput`).
- `GET /api/v1/security/policies/:scope` – aktive Policies eines Moduls lesen.
- `POST /api/v1/security/secrets/rotate` – Secret-Rotation triggern (nur mit `security.admin`-Permission).
- `GET /api/v1/security/threats` – Threat-Event-Liste mit Filter (severity, category, tenantId-Scoping).
- `POST /api/v1/security/scan` – on-demand Security-Scan eines Moduls (idempotent via ExecutionKey).
- Alle Endpunkte nutzen `requireApiPermission` und `withApiContext`; Responses im Band-10-Envelope.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `security.policy.updated.v1` – bei Policy-Änderung (tenantId, scope, version).
- `security.secret.rotated.v1` – bei erfolgreicher Rotation.
- `security.threat.detected.v1` – bei neuem ThreatEvent (severity≥high → Alarmierung).
- `security.scan.completed.v1` – Scan-Ergebnis mit Findings-Referenz.
- Events werden über die bestehende Outbox geschrieben; Consumer: Audit Center (Band 76), Monitoring (Band 77).

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Policy-Evaluation: Request → `policy.ts` Auswertung → Block/Allow + `ThreatEvent`-Log bei Violation.
- Secret-Rotation: Rotation-Service → Vault-Backend → `SecretReference`-Update → Event → Audit-Eintrag.
- Threat-Response: Detection → Severity-Triage → optional Auto-Mitigation (Rate-Limit erhöhen) → Notification.
- Scan-Workflow: Job-Queue → Modul-Analyse → Findings persistieren → `security.scan.completed.v1`.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `security-analyst` Agent: konsumiert Threat-Events, korreliert Angriffsmuster, schlägt Mitigation vor.
- `policy-guardian` Agent: prüft neue Module/PRs gegen Security-Policy-Vorlage.
- Beide registrieren sich in der Band-11-Agent-Runtime; keinen eigenen Agent-Loop.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- `src/app/app/security` Dashboard: Threat-Map, Policy-Status, Secret-Rotation-Status.
- Policy-Editor-Komponente (Server-Actions → API), zeigt aktive Regeln je Modul.
- Keine Security-Entscheidungslogik im Client; alle Checks serverseitig via `rbac.ts`.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: `policy.ts` Regelauswertung, `tenant.ts` Isolation, Rate-Limit-Logik.
- Integration: Policy-Erstellung → Enforcement → Block bei Violation.
- Security-Test: Cross-Tenant-Policy-Zugriff muss 403 liefern; Secret-Klartext nie in Response/Log.
- Pen-Test-Hooks: Injection/Vault-Leak-Szenarien als Vitest-Suites.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- AuthN über bestehendes Session-System (`src/lib/auth/session.ts`), keine zweite Auth.
- AuthZ über `rbac.ts` mit `security.*`-Permissions; Tenant-Scoping via `tenant.ts`.
- Secrets ausschließlich im Vault-Backend, referenziert über `SecretReference`; niemals in Code/Logs/Docs.
- Härtung: Security-Header (CSP, HSTS), TLS-Enforcement, Dependency-Scan in CI.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `SecurityPolicy(tenantId, scope)`, `ThreatEvent(tenantId, detectedAt, severity)`.
- Policy-Auswertung gecached (TTL 60s) pro tenantId+scope; p95 < 5ms Enforcement-Overhead.
- Threat-Detection asynchron via Queue; Scan-Jobs batch-orientiert.
- Secret-Rotation nicht blockierend (lazy re-key nach Rotation).

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines/Auth.
7. Security-Test: Cross-Tenant-Block bestanden.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
