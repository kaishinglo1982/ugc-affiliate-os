# CarryOS Universe – Band 74
# Masterprompt: DSGVO (VOLLSTÄNDIG)

> Band: 74 | Masterprompt: 74.0 | Status: PLANNED | Gruppe: Enterprise
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

## Kapitel 1 – Architektur

Beschreibt die DSGVO-Schichten. Erweitert bestehende Module statt Neuaufbau.

- Thema: Privacy-by-Design Framework für Betroffenenrechte, Einwilligungen und Datenminimierung.
- Consent-Registry in `src/lib/privacy/consent.ts`; baut auf Tenant-Modell aus `tenant.ts`.
- Data-Subject-Request (DSR) Pipeline: Anfrage → Identity-Check (IAM 72) → Sammlung → Lieferung/Löschung.
- Integration mit Audit (`src/lib/audit`) für Rechenschaftspflicht (Art. 5 Abs. 2).
- Kein zweites Personen-Datenmodell: DSR nutzt bestehende tenant-isolierte Tabellen via Repository-Layer.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `ConsentRecord`: tenantId, subjectId, purpose, grantedAt, revokedAt, version, channel.
- `DataSubjectRequest`: tenantId, type (access/erase/port/rect), status, subjectId, requestedAt, dueAt.
- `ProcessingActivity`: tenantId, name, legalBasis (art6), categories, recipients, retention.
- `RetentionPolicy`: tenantId, dataType, retentionDays, autoErase.
- Alle Entitäten tenant-isoliert; subjectId pseudonymisiert gespeichert.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `POST /api/v1/privacy/consent` – Einwilligung geben/widerrufen (Zod `ConsentInput`).
- `POST /api/v1/privacy/dsr` – DSR (Access/Erase/Portability) beantragen, idempotent.
- `GET /api/v1/privacy/dsr/:id` – DSR-Status/Fortschritt.
- `GET /api/v1/privacy/activities` – Verzeichnis von Verarbeitungstätigkeiten (Art. 30).
- Endpunkte nutzen `withApiContext` + `requireApiPermission`; subjectId-Scoping erzwungen.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `privacy.consent.changed.v1` – Einwilligung erteilt/widerrufen.
- `privacy.dsr.requested.v1` – neues Betroffenenersuchen.
- `privacy.dsr.completed.v1` – DSR abgeschlossen (Frist Art. 12/15–17).
- `privacy.retention.erased.v1` – automatische Löschung nach RetentionPolicy.
- Consumer: Audit Center (76), Compliance (73).

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Consent: Mutation → `ConsentRecord`-Upsert → Event → UI-Reflection.
- DSR-Access: Identity-Check → Suche über alle tenant-Tabellen → Paketierung → Lieferung.
- DSR-Erase: Identity-Check → kaskadierende Löschung (Repository-Layer) → `privacy.dsr.completed.v1`.
- Retention: Cron → `RetentionPolicy` prüfen → anonymisieren/löschen → Event.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `privacy-guardian` Agent: erkennt Verarbeitungen ohne Rechtsgrundlage, überfällige DSR.
- `dsr-fulfiller` Agent: orchestriert Sammlung/Löschung über Module hinweg.
- Registrierung in Band-11-Runtime; kein eigener Loop.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- `src/app/app/privacy` Portal: Consent-Verwaltung, DSR-Status, Verarbeitungsverzeichnis.
- Betroffenen-Self-Service (Consent + DSR) ohne Auth-Fork; nutzt Session-System.
- Keine DSR-Sammellogik im Client; serverseitig über Repositories.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: `consent.ts` Gültigkeit, Retention-Berechnung, DSR-Fristenlogik.
- Integration: DSR-Erase löscht über alle Tabellen; DSR-Access liefert vollständiges Paket.
- Security-Test: Cross-Tenant DSR/Consent nicht zugreifbar; subjectId nicht re-identifizierbar im Log.
- Negative: DSR nach Ablauf der Frist eskaliert (Overdue-Flag).

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- AuthN über Session-System; DSR-Identity-Check via IAM (72).
- AuthZ via `rbac.ts`; Tenant-Isolation via `tenant.ts` bei allen Privacy-Queries.
- Keine Klartext-Personendaten in Logs; subjectId pseudonymisiert.
- Einwilligungsnachweise manipulationssicher (Audit-gebunden, Art. 7 Abs. 1).

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `ConsentRecord(tenantId, subjectId, purpose)`, `DataSubjectRequest(tenantId, dueAt)`.
- DSR-Sammlung asynchron (Queue); p95 Statusabfrage < 50ms.
- Consent-Cache pro (tenantId, subjectId): p95 < 3ms im Request-Path.
- Retention-Job batch-orientiert, außerhalb der Spitzenzeiten.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Security-Test: Cross-Tenant-Privacy-Block bestanden.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
