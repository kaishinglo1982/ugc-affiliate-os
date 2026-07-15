# CarryOS Universe – Band 31
# Masterprompt: Garten- und Landschaftsbau (VOLLSTÄNDIG)

> Band: 31 | Masterprompt: 31.0 | Status: PLANNED | Gruppe: Business Editions II
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Branchen-Edition als Plugin/Config auf CarryOS Core. Handwerker Core (Band 24) ist Grundlage. Kein Fork, Tenant-Isolation, Band-10-API-Standard, Audit.

## Kapitel 1 – Architektur

GaLa-Bau-Edition als registrierte Industry-Edition über die Industry Solution Factory (Band 16) auf Basis von Handwerker Core (Band 24). Alle Prozesse laufen über CarryOS Core Runtime, EventBus und Finance OS.

- Plugin-Manifest `industry.gala-bau` registriert in Band 16 Registry; lädt Konfig, Workflow-Defs und Agenten-Rollen, keine eigenen Server-Prozesse.
- Wiederverwendung der Handwerker Core Entitäten (Projekt, Aufmaß, Gerät) aus Band 24; branchenspezifische Erweiterung nur via Extension-Tabellen mit tenantId.
- Standort- und Flächenmodell: Geokoordinaten, Gemarkung/Flurstück und Bepflanzungszonen als eigenes Submodul, angebunden an Core GeoService.
- Saisonale Ressourcenplanung (Personal, Maschinen, Subunternehmer) nutzt den Core Scheduler, keine eigene Planungs-Engine.

## Kapitel 2 – Datenmodelle

Tenant-isoliert via tenantId auf allen Entitäten. GaLa-spezifische Erweiterungen als Extension-Modelle, keine Core-Fork.

- `GalaProject` (Erweiterung von Handwerker Core Project): Bodenart, Hangneigung, Wasseranschluss, Pflanzplan-Version, Abnahmekriterien.
- `PlantingZone` mit `geometryWKT`, `plantSpeciesId`, `quantity`, `careCycleId`; referenziert `PlantCatalog`.
- `PlantCatalog`: botanische Daten (Latein/Deutsch, Wuchsbreite, Winterhärtezone, Pflegeaufwand) mandantenübergreifend read-only.
- `MaintenanceContract`: Turnus (wöchentlich/monatlich/saisonal), Leistungspositionen, Rasen-/Gehölzpflege, gekoppelt an Finance OS Abo-Rechnung.
- `MachineryLog`: Einsatzstunden pro Maschine und Projekt für Kostenzuordnung und Wartungsintervalle.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod, Pfad-Versionierung `/api/v1/...`).

- `POST /api/v1/gala/projects` – GaLa-Projekt mit Boden-/Flächendaten anlegen (Zod-Schema `galaProjectCreateSchema`).
- `GET /api/v1/gala/projects/{id}/planting-zones` – Zonen inkl. Pflanzplan abrufen.
- `POST /api/v1/gala/maintenance-contracts` – Pflegevertrag mit Turnus und Leistungspositionen erstellen.
- `POST /api/v1/gala/machinery/log` – Maschinenstunden erfassen, trigger für Wartungs-Event.
- `GET /api/v1/gala/plant-catalog` – Pflanzenkatalog mit Filter nach Winterhärtezone/Bodenart.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue im Core. `event.name.v1`, tenantId im Header.

- `gala.project.created.v1` – neues Projekt, triggert Angebotserstellung (Band 14/44).
- `gala.planting-zone.planted.v1` – dokumentiert Pflanzung für Abnahme und Garantielaufzeit.
- `gala.maintenance.due.v1` – Turnus erreicht, erzeugt Serviceauftrag im Scheduler.
- `gala.machinery.service-due.v1` – Wartungsintervall überschritten, Warnung an Disposition.
- `gala.contract.renewal.v1` – Pflegevertrag läuft aus, Finance OS erstellt Verlängerungsangebot.

## Kapitel 5 – Workflows

Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Projektangebot: Aufmaß → Bodenanalyse → Pflanzplan → Materialkalkulation → Angebot (Finance OS) → Freigabe.
- Pflegevertrag-Lebenszyklus: Anlage → Turnus-Generierung → Einsatzplanung → Durchführung → Abrechnung (Abo).
- Saisonale Disposition: Personal-/Maschinenverfügbarkeit → Subunternehmer-Zuweisung → Einsatzbestätigung.
- Winterdienst-Option: Wetter-Trigger (externer Free-Tier-Feed) → Räumauftrag → Dokumentation.

## Kapitel 6 – Agenten

Agenten/Rollen registriert in Band 11 Runtime, keine eigene Agent-Infrastruktur.

- `GalaDisponent` – plant Einsätze, gleicht Personal/Maschinen/Subunternehmer ab.
- `GartenplanerAgent` – schlägt Pflanzpläne nach Bodenart, Licht und Winterhärtezone vor.
- `PflegeVertragsAgent` – überwacht Turnus, erzeugt Serviceaufträge und Verlängerungsangebote.
- `MachineryAgent` – wertet Einsatzstunden aus und löst Wartungs-Events aus.

## Kapitel 7 – UI

Dashboards/Komponenten als Core-Plugin-Views; keine Fachlogik in Client-Komponenten.

- GaLa-Dispositionsboard: Kartenansicht Projekte mit Standort-Map (Core GeoService), Maschinen- und Personaleinsatz.
- Pflanzplan-Editor: Zonen zeichnen, Pflanzenkatalog zuweisen, Pflegezyklus definieren.
- Pflegevertrags-Cockpit: Turnus-Kalender, offene Einsätze, Abo-Umsatz (Finance OS Widget).
- Maschinen-/Flotten-Status: Auslastung, Wartungsfristen, Kosten pro Projekt.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Erfolgs- und Fehlerpfade abdecken.

- Unit: Zod-Schemas für `galaProjectCreateSchema`, Pflanzplan-Validierung, Turnus-Berechnung.
- Integration: Projekt-Anlage → Event `gala.project.created.v1` → Angebotserstellung End-to-End.
- Security: Cross-Tenant-Zugriff auf `PlantingZone`/`MaintenanceContract` muss mit 403 scheitern.
- UI: Pflanzplan-Editor render ohne Fachlogik im Client; Daten via API-Route.

## Kapitel 9 – Security

Authentifizierung über Core (keine zweite), Autorisierung via `requireApiPermission`, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Permission `gala:project:write` etc. über Core RBAC; Standortdaten nur für autorisierte Disponenten.
- Geodaten (Flurstück, Privatadressen) als sensible PII klassifizieren, Audit-Log bei jedem Export.
- Subunternehmer-Zugang: eingeschränkter Workspace-Scoped Token, kein Core-Admin.
- DSGVO: Löschkonzept für Kundenstandorte bei Vertragsende, verknüpft mit Core Retention.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele (Core-Vorgaben).

- Composite-Index `(tenantId, projectId)` auf `PlantingZone` und `MaintenanceContract`.
- Pflanzenkatalog read-only cachen (mandantenübergreifend, TTL 24h) zur Vermeidung von Hot-Queries.
- Turnus-Generierung asynchron via Queue, nicht im Request-Pfad des Anlegens.
- Geo-Queries über Core GeoService mit räumlichem Index; p95 Ziel < 300ms für Zonen-Abruf.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Tenant-Isolation-Test grün. 8. Band-16 Plugin-Manifest validiert.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
