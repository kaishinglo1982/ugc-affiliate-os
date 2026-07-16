# CarryOS Universe – Band 38
# Masterprompt: Bodenleger (VOLLSTÄNDIG)

> Band: 38 | Masterprompt: 38.0 | Status: PLANNED | Gruppe: Business Editions II
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Branchen-Edition als Plugin/Config auf CarryOS Core. Handwerker Core (Band 24) ist Grundlage. Kein Fork, Tenant-Isolation, Band-10-API-Standard, Audit.

## Kapitel 1 – Architektur

Bodenleger-Edition als registrierte Industry-Edition über Band 16 auf Basis Handwerker Core (Band 24). Untergrundprüfung, Bodenkonfiguration, Verlegung und Abnahme laufen über Core Runtime/EventBus/Finance OS.

- Plugin-Manifest `industry.bodenleger` in Band 16 Registry; lädt Belag-/Unterbau-Kataloge und Agenten-Rollen.
- Wiederverwendung von Core `Project`/`Offer`/`Measurement`; branchespezifisch nur Extension-Tabellen mit tenantId.
- Eignungs-/Aufbau-Prüfung (Feuchtigkeit, Ebenheit) als regelbasiertes Modul auf Core Rules Engine, keine eigene Prüf-Engine.
- Verlege- und Terminplanung nutzen Core Scheduler, keine eigene Planungs-Engine.

## Kapitel 2 – Datenmodelle

Tenant-isoliert via tenantId. Bodenlegerspezifische Erweiterungen als Extension-Modelle, keine Core-Fork.

- `FloorArea` (Extension Core Measurement): Raum, Fläche m², Untergrund (Estrich/Beton/Holz), Feuchtewert CM%.
- `FloorBuildup`: Aufbau (Vorstrich/Dämmung/Belag), Belagart (Parkett/Laminat/Fliese/Teppich), Verlegerichtung.
- `FloorBOM`: Stückliste je Bereich (Belag, Zubehör, Kleber), inkl. Verschnitt, für Einkauf/Preis.
- `SubfloorCheck`: Eignungsnachweis (Feuchte/Ebenheit), Prüfstatus, Dokumentationspflicht.
- `LayingProgress`: Verlegefortschritt je Bereich mit Foto-Referenz (Core FileStore).

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod, Pfad-Versionierung).

- `POST /api/v1/floor/areas` – Boden-Bereich mit Untergrund/Feuchte anlegen (Zod `floorAreaSchema`).
- `POST /api/v1/floor/buildups` – Bodenaufbau/Belag konfigurieren.
- `POST /api/v1/floor/subfloor/check` – Eignungsprüfung durchführen.
- `POST /api/v1/floor/bom/generate` – Stückliste erzeugen.
- `POST /api/v1/floor/progress` – Verlegefortschritt mit Foto erfassen.

## Kapitel 4 – Events

Versionierte Events über Core Outbox/Queue. `event.name.v1`, tenantId im Header.

- `floor.area.measured.v1` – Bereich erfasst, triggert Eignungsprüfung.
- `floor.subfloor.failed.v1` – Untergrund ungeeignet, blockiert Verlegung bis Maßnahme.
- `floor.bom.created.v1` – Stückliste erzeugt, triggert Einkauf (Band 45) und Angebot.
- `floor.progress.updated.v1` – Fortschritt erfasst, Update an Projekt-Dashboard.
- `floor.laid.v1` – Bereich abgenommen, triggert Rechnung (Finance OS).

## Kapitel 5 – Workflows

Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Planung: Aufmaß → Untergrundprüfung → Aufbau/Belag → Stückliste → Angebot (Finance OS).
- Beschaffung: BOM → Einkauf (Band 45) → Liefertermin → Wareneingang → Verlege-Bereit.
- Verlegung: Termin → Untergrundvorbereitung → Verlegung → Fortschritt → Abnahme.
- Reklamation: Mangel → Prüfung → Nachbesserung/Garantie → Dokumentation.

## Kapitel 6 – Agenten

Agenten/Rollen in Band 11 Runtime, keine eigene Agent-Infrastruktur.

- `BodenBeraterAgent` – schlägt Belag/Aufbau nach Untergrund und Nutzung vor.
- `EignungsAgent` – prüft Feuchte/Ebenheit gegen Verlegefreigabe (CM%/DIN).
- `MengenAgent` – berechnet m² inkl. Verschnitt und erzeugt Stückliste.
- `VerlegeDisponent` – koordiniert Termine und Untergrundvorbereitung.

## Kapitel 7 – UI

Dashboards/Komponenten als Core-Plugin-Views; keine Fachlogik in Client-Komponenten.

- Bereichs-Planer: Flächen/Untergrund/Feuchte erfassen, Live-Eignungsprüfung.
- Belag-Konfigurator: Aufbau/Belag wählen, Live-Preis aus BOM.
- BOM-Übersicht: Artikel, Mengen, Beschaffungsstatus, Liefertermine.
- Fortschritts-Board: Verlegung je Bereich, Fotos, Abnahmestatus.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Erfolgs- und Fehlerpfade abdecken.

- Unit: Zod `floorAreaSchema`, Eignungsregeln (CM%-Grenzwert), Mengenberechnung mit Verschnitt.
- Integration: Bereich → Eignungsprüfung → BOM → Verlege-ready End-to-End.
- Security: Cross-Tenant-Zugriff auf `FloorArea`/`FloorBOM` muss mit 403 scheitern.
- UI: Eignungsprüfung serverseitig, Client nur Anzeige.

## Kapitel 9 – Security

Authentifizierung über Core (keine zweite), Autorisierung via `requireApiPermission`, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Permission `floor:area:write`, `floor:bom:write` über Core RBAC.
- Kundenadressen/Grundrisse als PII in Core Vault, Audit bei Export.
- Fremdverleger-Partner: Workspace-Scoped Token, reduzierter Scope.
- Audit-Log Pflicht für Eignungsprüfungen und Abnahmen.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele (Core-Vorgaben).

- Composite-Index `(tenantId, projectId)` auf `FloorArea` und `FloorBOM`.
- Katalog-Artikel read-only cachen (TTL 12h), p95 Ziel < 200ms für BOM-Generierung.
- BOM-Generierung asynchron via Queue bei großen Flächen, nicht im Request-Pfad.
- Foto-Referenzen via Core FileStore, p95 Ziel < 300ms für Bereichs-Abruf.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Tenant-Isolation-Test grün. 8. Band-16 Plugin-Manifest validiert.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
