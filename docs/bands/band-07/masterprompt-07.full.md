# CarryOS Universe – Band 07
# Masterprompt: Security Foundation (VOLLSTÄNDIG)

> Band: 7 | Masterprompt: 7.0 | Status: PLANNED | Gruppe: Foundation
> Abhängigkeit: Band 1 (Vision/Strategie)

> Hinweis: Planungs-Masterprompt. Definiert Sicherheits-Basis: Auth, Autorisierung, Secrets, Audit und Threat-Modell für CarryOS Core. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork.

## Kapitel 1 – Architektur

- Eine Authentifizierungsinstanz (CarryOS Auth), keine zweite; Sessions/Tokens zentral verwaltet und rotiert.
- Authorization-Layer zentral via `requireApiPermission` + Rollen/Scopes, in jedem Service-Entry erzwungen.
- Security ist Querschnitt: Auth/Authz/Secrets/Audit als Core-Package, von allen Bändern/Editionen konsumiert.
- Zero-Trust-Default: jeder Request/Event ohne gültigen tenantId-Scope wird abgelehnt, nicht toleriert.
- Keine zweite Security-Infrastruktur (kein eigenes IAM neben Band 72, kein zweiter Secret-Store).

## Kapitel 2 – Datenmodelle

- `User`, `Role`, `Permission`, `TenantMembership`, `ApiKey` ( hashed), `AuditLog` – alle tenantId-gebunden (außer User global mit Tenant-Membership).
- `AuditLog`: id, tenantId, actorId, action, entity, entityId, beforeHash, afterHash, createdAt, ipHash (Append-Only).
- `ApiKey`: id, tenantId, userId, name, keyHash (bcrypt/scrypt), scopes, rotatedAt, revokedAt – niemals Plain-Key in DB.
- `Session`/`Token`: tenantId, userId, expiresAt, scopes, deviceHash – Rotation verpflichtend.
- Secrets/PII nie als Plain-Text; sensible Referenzen über Secret-Store-Handle, nicht als Wert.

## Kapitel 3 – APIs

- Jeder Endpunkt erfordert gültiges Auth (withApiContext validiert Token/Session), sonst 401.
- `requireApiPermission(scope)` im Service-Entry; fehlende Berechtigung → 403, niemals 404-maskieren.
- API-Keys/Token im Header nur über TLS; keine Secrets in Query/Body/Logs.
- Fehler-Envelope enthält niemals Stacktrace/Interna; Details nur in AuditLog (tenant-zuordbar).
- Rate-Limiting + Brute-Force-Schutz pro Tenant/User auf Auth-Endpunkten verpflichtend.

## Kapitel 4 – Events

- Security-Events emitieren versioniert: `auth.login.v1`, `auth.permission.denied.v1`, `secret.rotated.v1` über Outbox.
- Security-Events tragen tenantId, konsumiert von Audit/Observability, niemals Cross-Tenant.
- Keine Secrets in Event-Payloads; nur Referenzen/Handles, niemals Werte.
- Verdächtige Aktivität (mehrfache 403, Token-Missbrauch) triggert `security.alert.v1` an Audit/Monitoring.
- Event-Replay von Security-Events auditiert, kein ungeprüftes Replay möglich.

## Kapitel 5 – Workflows

- Sensitive Workflows (Permission-Change, Tenant-Config, Key-Rotation) erfordern Audit + Authorization-Step.
- Idempotenz auch für Security-Mutationen: Rotation/Revoke via ExecutionKey, Duplicate ist No-Op.
- Break-Glass/Admin-Prozesse mehrstufig + auditiert, keine Einzelaktion ohne Nachweis.
- Workflow-Schritte mit Security-Relevanz schreiben zwingend AuditLog (wer/wann/welcher Tenant).
- Saga-Kompensation für Security-Rollback (z. B. revert Permission Grant) versioniert als Event.

## Kapitel 6 – Agenten

- Agenten erhalten minimalen Scope (Least-Privilege), nur autorisierte Tools, kein All-Access.
- Agent-Context (tenantId, workspaceId, role, scopes) zentral injiziert + auditiert, nicht manuell übergeben.
- Agent-Aktionen gegen APIs nur über geprüfte Clients; ungeprüfte Direktaufrufe per Lint verboten.
- Agent-Triggered Security-Events (`agent.action.v1`) tenant-isolierbar + auditierbar.
- Keine zweite Agent-Auth; Band 11 Runtime nutzt Core-Auth/Authz ausschließlich.

## Kapitel 7 – UI

- Login/Permission-UI nutzt Core-Auth, keine eigene Auth-Oberfläche pro Edition.
- Fehleranzeige: generische Meldung (401/403), Details nur für autorisierten Admin im Audit-Log-View.
- Tenant-Scoped Admin-Ansichten: Nutzer sieht nur Daten seines Tenant/Workspace, serverseitig gefiltert.
- Keine Secrets/Token im Client-State/Cache; nur opaque Session-Referenz.
- Security-Dashboards read-only Visualisierung, keine Mutationspfade ohne Authz-Step.

## Kapitel 8 – Tests

- Auth-Tests: gültiges/abgelaufenes/rotiertes Token korrekt akzeptiert/abgelehnt (401).
- Authorization-Tests: fehlender Scope → 403, korrekter Scope → 200, keine 404-Maskierung.
- Tenant-Escalation-Tests: User Tenant A greift auf Tenant B zu → 403/404, niemals Datenleak.
- Secret-Scan-Tests in CI: keine hartkodierten Keys/Token in Diff, Block bei Verdacht.
- Audit-Tests: kritische Mutation schreibt AuditLog-Row mit korrektem tenantId + actor.

## Kapitel 9 – Security

- Authentifizierung: exakt eine Instanz, TLS-only, Token-Rotation + Revocation verpflichtend.
- Autorisierung: RBAC/Scopes via requireApiPermission, serverseitig erzwungen, Least-Privilege-Default.
- Tenant-Isolation: jede Query/Event/Cache-Entry tenantId-gebunden, Architekturtest lehnt Verstöße ab.
- Secrets: ausschließlich über Secret-Store, niemals in Code/Logs/Prompts/Docs; Rotation policy definiert.
- Audit: Append-Only, tenant-zuordbar, tamper-resistent für Auth/Authz/Finance/Tenant-Config.

## Kapitel 10 – Performance

- Auth-Validation lokal cachebar (Token-Introspection kurzfristig), p95 < 20ms für Kontext-Aufbau.
- Permission-Checks über vor-geladene Scope-Set, keine N+1 DB-Lookups pro Request.
- Audit-Write asynchron über Outbox, blockiert Happy-Path nicht.
- Rate-Limit-Counter tenant-scoped in Memory/Redis, kein globaler Zähler mit Tenant-Daten.
- Secret-Store-Zugriff gepoolt, keine pro-Request Neuanbindung.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün (Secret-Scan + Architekturtests). 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests (Auth/Authz/Tenant-Escalation) grün. 6. Secret-Scan CI grün.
7. Audit-Tests grün.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
