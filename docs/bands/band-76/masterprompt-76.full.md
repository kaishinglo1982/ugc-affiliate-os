# CarryOS Universe – Band 76
# Masterprompt: Audit Center (VOLLSTÄNDIG)

> Band: 76 | Masterprompt: 76.0 | Status: PLANNED | Gruppe: Enterprise
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

## Kapitel 1 – Architektur

Beschreibt die Audit-Center-Schichten. Erweitert bestehendes `src/lib/audit`.

- Thema: Zentrales, manipulationssicheres Audit-Log als Single Source of Truth für alle Bänder.
- Erweitert `src/lib/audit/log.ts` + `format.ts` um tenant-aware Query, Retention, Export.
- Append-only Store; Schreibzugriff nur über `log.ts`, Löschen nur via RetentionPolicy (74).
- Integration: alle Bänder (71–75, 77–80) emittieren Events → Audit-Consumer.
- Keine zweite Audit-Infrastruktur: alle Module loggen über `src/lib/audit`.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `AuditLog` (erweitert bestehend): tenantId, actorId, action, resource, beforeHash, afterHash, eventId, createdAt.
- `AuditExport`: tenantId, requestedBy, scope, format, signedAt, fileRef.
- `AuditRetention`: tenantId, category, retentionDays, legalHold.
- `AuditWatch`: tenantId, pattern, alertChannel, severity.
- Tabellen tenant-isoliert via `tenant.ts`; hash-chain für Integrität.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `GET /api/v1/audit/logs` – gefilterte Audit-Logs (Zod `AuditQuery`: actor, action, from, to).
- `POST /api/v1/audit/exports` – Export erzeugen (Permission `audit.export`).
- `GET /api/v1/audit/watches` / `POST` – Watch-Regeln verwalten.
- `GET /api/v1/audit/integrity` – Hash-Chain-Verifikation abrufen.
- Endpunkte nutzen `withApiContext`; nur lesend für Nicht-Admin, Write nur über `log.ts`.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `audit.log.written.v1` – neuer Eintrag (von allen Bändern konsumiert/indiziert).
- `audit.export.created.v1` – Export erzeugt.
- `audit.integrity.breach.v1` – Hash-Chain-Inkonsistenz erkannt (kritisch).
- `audit.watch.triggered.v1` – Watch-Regel traf zu → Alert.
- Consumer: Security (71), Compliance (73), Observability (78).

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Log-Schreiben: Aktion → `log.ts` (tenantId-Pflicht) → Hash-Chain-Append → Event.
- Export: Anfrage → Scope-Query → signierte Datei → `AuditExport` → Event.
- Integrity-Check: periodisch → Hash-Chain verifizieren → bei Bruch `audit.integrity.breach.v1`.
- Watch: Eintrag → Pattern-Match → Alert → `audit.watch.triggered.v1`.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `audit-inspector` Agent: analysiert Logs auf Anomalien, verdächtige Aktoren.
- `integrity-sentinel` Agent: überwacht Hash-Chain-Kontinuität kontinuierlich.
- Registrierung in Band-11-Runtime; kein eigener Loop.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- `src/app/app/audit-log` und `src/app/app/audit` erweitern: Filter, Timeline, Export.
- Watch-Manager-Komponente; Integritäts-Status-Indikator.
- Keine Logik im Client; alle Queries serverseitig über `log.ts`/Repository.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: `log.ts` Hash-Chain, `format.ts` Ausgabe, Query-Filter.
- Integration: Log-Schreiben → Export enthält Einträge → Integritätsprüfung grün.
- Security-Test: Cross-Tenant Audit-Zugriff liefert 403; kein Log ohne tenantId schreibbar.
- Negative: manipulierter Hash-Chain wird als Breach erkannt.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- AuthN über Session-System; AuthZ via `rbac.ts` mit `audit.*`-Permissions.
- Tenant-Isolation via `tenant.ts`; Logs strikt nach tenantId partitioniert.
- Niemals Secrets/PII im `afterHash`/Payload-Klartext; sensibele Felder maskiert.
- Schreibzugriff exklusiv über `log.ts`; kein direkter DB-Write.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `AuditLog(tenantId, createdAt)`, `(tenantId, actorId, action)`.
- Log-Write p95 < 10ms (async append); Query über partitioniertes Read-Model.
- Export asynchron generiert (Queue); Integrity-Check off-peak.
- Hash-Chain-Increment lokal gepuffert, Batch-Flush.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Security-Test: Cross-Tenant-Audit-Block + Hash-Chain-Integrität bestanden.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
