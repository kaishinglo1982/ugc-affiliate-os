# CarryOS Universe – Band 34
# Masterprompt: Fensterbauer (VOLLSTÄNDIG)

> Band: 34 | Masterprompt: 34.0 | Status: PLANNED | Gruppe: Business Editions II
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Branchen-Edition als Plugin/Config auf CarryOS Core. Handwerker Core (Band 24) ist Grundlage. Kein Fork, Tenant-Isolation, Band-10-API-Standard, Audit.

## Kapitel 1 – Architektur

Fensterbauer-Edition als registrierte Industry-Edition über Band 16 auf Basis Handwerker Core (Band 24). Maßnahme, Konfiguration, Produktion und Einbau laufen über Core Runtime/EventBus/Finance OS.

- Plugin-Manifest `industry.fensterbauer` in Band 16 Registry; lädt Profil-/Beschlag-Kataloge und Agenten-Rollen.
- Wiederverwendung von Core `Project`/`Offer`/`Measurement`; branchespezifisch nur Extension-Tabellen mit tenantId.
- Fenster-Konfigurator als regelbasiertes Modul (Profil, Glas, Beschlag, Maße) auf Core Rules Engine, keine eigene Konfig-Engine.
- Einbau- und Produktionsplanung nutzen Core Scheduler, keine eigene Planungs-Engine.

## Kapitel 2 – Datenmodelle

Tenant-isoliert via tenantId. Fensterbauerspezifische Erweiterungen als Extension-Modelle, keine Core-Fork.

- `WindowUnit` (Extension Core Measurement): Profilart, Rahmenmaß B/H, Glasart (UG-Wert), Beschlag, Farbe, Anzahl Flügel.
- `WindowConfig` (regelbasiert): Kombination Profil+Glas+Beschlag mit Preis- und Produktionsregeln.
- `ProductionOrder`: Werkauftrag je WindowUnit, Status (Konstruktion/Fertigung/Beschichtung/Montage-ready).
- `InstallationAppointment`: Einbau-Termin mit Montage-Team, Adresse, Zugangsinfos.
- `GlazingSpec`: Glasaufbau (Scheiben, Gasfüllung, Beschichtung) für ENERGIE-Nachweis.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod, Pfad-Versionierung).

- `POST /api/v1/window/units` – Fenstereinheit mit Maßen/Konfiguration anlegen (Zod `windowUnitSchema`).
- `POST /api/v1/window/config/validate` – Konfigurationsregeln prüfen (Profil/Glas/Beschlag kompatibel).
- `POST /api/v1/window/production-orders` – Werkauftrag aus WindowUnit erzeugen.
- `POST /api/v1/window/installations` – Einbau-Termin planen.
- `GET /api/v1/window/units/{id}/energy` – UG-Wert/Nachweis abrufen.

## Kapitel 4 – Events

Versionierte Events über Core Outbox/Queue. `event.name.v1`, tenantId im Header.

- `window.unit.configured.v1` – Fenster konfiguriert, triggert Preis-/Energie-Nachweis.
- `window.production.started.v1` – Werkauftrag begonnen, Status-Update an Projekt.
- `window.production.ready.v1` – fertig zur Montage, triggert Einbau-Disposition.
- `window.installed.v1` – Einbau bestätigt, triggert Abnahme/Rechnung (Finance OS).
- `window.config.invalid.v1` – Regelverletzung, Blockiere Angebotserstellung.

## Kapitel 5 – Workflows

Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Angebot: Aufmaß → Konfiguration → Regelprüfung → Preis/Energie → Angebot (Finance OS) → Freigabe.
- Produktion: Werkauftrag → Konstruktion → Fertigung → Beschichtung → QC → Montage-ready.
- Einbau: Termin → Montage-Team → Durchführung → Abnahme → Mängelprotokoll → Rechnung.
- Reklamation: Mangel-Meldung → Prüfung → Nachbesserung/Garantie → Dokumentation.

## Kapitel 6 – Agenten

Agenten/Rollen in Band 11 Runtime, keine eigene Agent-Infrastruktur.

- `FensterKonfiguratorAgent` – schlägt Profile/Glas/Beschlag nach Vorgaben und Regeln vor.
- `ProduktionsPlanerAgent` – plant Werkaufträge und überwacht Lieferfristen.
- `EinbauDisponent` – koordiniert Montage-Termine und Teams.
- `EnergieNachweisAgent` – berechnet UG-Werte und erzeugt Nachweisdokument.

## Kapitel 7 – UI

Dashboards/Komponenten als Core-Plugin-Views; keine Fachlogik in Client-Komponenten.

- Konfigurator-View: Profil/Glas/Beschlag auswählen, Live-Regelprüfung, Maßeingabe.
- Produktionsboard: Werkaufträge je Status, Lieferfristen, Engpässe.
- Einbau-Kalender: Termine, Teams, Adressen, Zugangsinfos.
- Energie-Nachweis-Widget: UG-Wert, Dokument-Export.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Erfolgs- und Fehlerpfade abdecken.

- Unit: Zod `windowUnitSchema`, Konfigurationsregeln (z. B. Glas zu Profil kompatibel), UG-Berechnung.
- Integration: Konfiguration → Regelprüfung → Werkauftrag → ready-Event End-to-End.
- Security: Cross-Tenant-Zugriff auf `WindowUnit`/`ProductionOrder` muss mit 403 scheitern.
- UI: Konfigurator sendet Daten, Regelprüfung serverseitig.

## Kapitel 9 – Security

Authentifizierung über Core (keine zweite), Autorisierung via `requireApiPermission`, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Permission `window:unit:write`, `window:production:write` über Core RBAC.
- Kundenadressen/Zugangsdaten als PII in Core Vault, Audit bei Export.
- Montage-Teams (extern): Workspace-Scoped Token, reduzierter Scope.
- Audit-Log Pflicht für Konfigurationsänderungen und Abnahmen.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele (Core-Vorgaben).

- Composite-Index `(tenantId, projectId)` auf `WindowUnit` und `ProductionOrder`.
- Konfigurationsregeln-Cache (regelbasiert, TTL), p95 Ziel < 200ms für Validierung.
- Produktionsstatus-Updates asynchron via Queue, nicht im Request-Pfad.
- Energie-Nachweis-Dokument via Core FileStore, p95 Ziel < 300ms für Unit-Abruf.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Tenant-Isolation-Test grün. 8. Band-16 Plugin-Manifest validiert.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
