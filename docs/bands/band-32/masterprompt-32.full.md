# CarryOS Universe – Band 32
# Masterprompt: Gebäudereinigung (VOLLSTÄNDIG)

> Band: 32 | Masterprompt: 32.0 | Status: PLANNED | Gruppe: Business Editions II
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Branchen-Edition als Plugin/Config auf CarryOS Core. Handwerker Core (Band 24) ist Grundlage. Kein Fork, Tenant-Isolation, Band-10-API-Standard, Audit.

## Kapitel 1 – Architektur

Gebäudereinigungs-Edition als registrierte Industry-Edition über Band 16 auf Basis Handwerker Core (Band 24). Leistungserfassung, Objektwirtschaft und Personaldisposition laufen über Core Runtime/EventBus/Finance OS.

- Plugin-Manifest `industry.gebaeudereinigung` in Band 16 Registry; lädt Objekt-Typen, Reinigungs-Leistungskatalog und Agenten-Rollen.
- Wiederverwendung von Handwerker Core `Site`/`Object`/`Crew`; branchespezifisch nur Extension-Tabellen mit tenantId.
- Objektwirtschaftsdatei (OWD)-Modell als Standardstruktur für Leistungsverzeichnisse, gekoppelt an Finance OS Abrechnung (Pauschal/Flex/Stunden).
- Schicht- und Streckenplanung nutzt Core Scheduler, keine eigene Planungs-Engine.

## Kapitel 2 – Datenmodelle

Tenant-isoliert via tenantId. Reinigungsspezifische Erweiterungen als Extension-Modelle, keine Core-Fork.

- `CleaningObject` (Extension von Core Site): Objektart (Büro/Praxis/Industrie/Schule), Reinigungsfläche m², Hygiene-Klasse, Zugangsregeln.
- `CleaningTaskCatalog`: Leistungspositionen (Grundreinigung, Unterhaltsreinigung, Glasreinigung, Sonderleistung) mit Einheit und RLB-Referenz.
- `ServiceRecord`: Durchführungsnachweis pro Objekt/Termin mit Personal, Zeit, Menge, Abweichung, Foto-Referenz (Core FileStore).
- `HygieneChecklist`: Pflichtpositionen je Hygiene-Klasse, Erfüllungsstatus für Audit.
- `CrewShift`: Schichtzuweisung Personal→Objekt→Zeitfenster, Basis für Abrechnung und Disposition.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod, Pfad-Versionierung).

- `POST /api/v1/cleaning/objects` – Reinigungsobjekt mit Fläche/Hygiene-Klasse anlegen.
- `POST /api/v1/cleaning/service-records` – Durchführungsnachweis erfassen (Zod `serviceRecordSchema`).
- `GET /api/v1/cleaning/objects/{id}/tasks` – Leistungsverzeichnis des Objekts abrufen.
- `POST /api/v1/cleaning/crews/shifts` – Schichtplanung Personal→Objekt zuweisen.
- `GET /api/v1/cleaning/quality-checks` – offene Hygiene-/Qualitätsprüfungen listen.

## Kapitel 4 – Events

Versionierte Events über Core Outbox/Queue. `event.name.v1`, tenantId im Header.

- `cleaning.object.onboarded.v1` – neues Objekt, triggert Leistungsverzeichnis-Generierung.
- `cleaning.service-record.submitted.v1` – Durchführung erfasst, triggert Abrechnung/Qualitätscheck.
- `cleaning.quality.deviation.v1` – Abweichung festgestellt, erzeugt Nachbesserungsauftrag.
- `cleaning.crew.shift-conflict.v1` – Überschneidung in Schichtplanung, Warnung Disposition.
- `cleaning.hygiene.check-due.v1` – Pflicht-Hygiene-Check fällig, Audit-Reminder.

## Kapitel 5 – Workflows

Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Objekt-Onboarding: Aufnahme → Leistungsverzeichnis → Angebot (Finance OS) → Vertrag → Schichtplan.
- Reinigungseinsatz: Schichtzuweisung → Durchführung → ServiceRecord → Qualitätscheck → Abrechnung.
- Nachbesserung: Deviation-Event → Nachbesserungsauftrag → erneuter ServiceRecord → Schließung.
- Reklamationsmanagement: Kunden-Reklamation → Prüfung → Maßnahme → Dokumentation/Audit.

## Kapitel 6 – Agenten

Agenten/Rollen in Band 11 Runtime, keine eigene Agent-Infrastruktur.

- `ReinigungsDisponent` – plant Schichten, gleicht Personal/Objekte/Zeitfenster ab.
- `ObjektbetreuerAgent` – überwacht Leistungsverzeichnis-Erfüllung je Objekt.
- `QM_Agent` – prüft ServiceRecords gegen HygieneChecklist, löst Deviation-Events aus.
- `AbrechnungsAgent` – aggregiert ServiceRecords zu Finance-OS-Rechnungen (Pauschal/Flex).

## Kapitel 7 – UI

Dashboards/Komponenten als Core-Plugin-Views; keine Fachlogik in Client-Komponenten.

- Objekt-Übersicht: Reinigungsobjekte mit Fläche, Hygiene-Klasse, nächstem Termin, Offen-Status.
- Schichtplan-Board: Personal×Objekt×Zeitfenster, Konfliktmarkierung.
- ServiceRecord-Erfassung (Mobile): Checklisten, Zeit/Menge, Foto-Upload via Core FileStore.
- QM-Dashboard: Abweichungen, offene Hygiene-Checks, Audit-Trail.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Erfolgs- und Fehlerpfade abdecken.

- Unit: Zod `serviceRecordSchema`, HygieneChecklist-Validierung, Abrechnungs-Aggregation.
- Integration: Objekt-Onboarding → Event → Leistungsverzeichnis-Generierung End-to-End.
- Security: Cross-Tenant-Zugriff auf `ServiceRecord`/`CleaningObject` muss mit 403 scheitern.
- UI: Mobile-Erfassung sendet nur Daten, keine Prüflogik im Client.

## Kapitel 9 – Security

Authentifizierung über Core (keine zweite), Autorisierung via `requireApiPermission`, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Permission `cleaning:object:write`, `cleaning:service-record:write` über Core RBAC.
- Zugangsdaten zu Kundenobjekten (Schließanlagen, Alarmanlagen) als Secrets in Core Vault, nie in Logs.
- Externe Reinigungskräfte: Workspace-Scoped Token mit reduziertem Scope, kein Core-Admin.
- Audit-Log Pflicht für alle ServiceRecords (Nachweispflicht nach DIN/Arbeitsschutz).

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele (Core-Vorgaben).

- Composite-Index `(tenantId, objectId)` auf `ServiceRecord` und `CrewShift`.
- Schichtplan-Abfragen über Materialized-View/Cache je Dispositionstag.
- Abrechnungs-Aggregation asynchron via Queue, nicht im Request-Pfad.
- Foto-Referenzen via Core FileStore CDN, p95 Ziel < 250ms für Objektliste.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Tenant-Isolation-Test grün. 8. Band-16 Plugin-Manifest validiert.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
