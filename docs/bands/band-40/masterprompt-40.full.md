# CarryOS Universe – Band 40
# Masterprompt: Rollladen & Sonnenschutz (VOLLSTÄNDIG)

> Band: 40 | Masterprompt: 40.0 | Status: PLANNED | Gruppe: Business Editions II
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Branchen-Edition als Plugin/Config auf CarryOS Core. Handwerker Core (Band 24) ist Grundlage. Kein Fork, Tenant-Isolation, Band-10-API-Standard, Audit.

## Kapitel 1 – Architektur

Rollladen- & Sonnenschutz-Edition als registrierte Industry-Edition über Band 16 auf Basis Handwerker Core (Band 24). Vermessung, Konfiguration, Smart-Home-Anbindung und Montage laufen über Core Runtime/EventBus/Finance OS.

- Plugin-Manifest `industry.rollladen-sonnenschutz` in Band 16 Registry; lädt Antriebs-/Behang-/Sensor-Kataloge und Agenten-Rollen.
- Wiederverwendung von Core `Project`/`Offer`/`Measurement`; branchespezifisch nur Extension-Tabellen mit tenantId.
- Antriebs-/Steuerungs-Konfiguration als regelbasiertes Modul auf Core Rules Engine, keine eigene Konfig-Engine.
- Smart-Home-Anbindung (Free-Tier- oder bereits bezahlte Provider) über Core Integration-Layer, keine zweite Integration-Architektur.

## Kapitel 2 – Datenmodelle

Tenant-isoliert via tenantId. Rollladen-/Sonnenschutzspezifische Erweiterungen als Extension-Modelle, keine Core-Fork.

- `ShadingUnit` (Extension Core Measurement): Fenstermaß B/H, Bauart (Rollladen/Screen/Markise), Behang-Material, Farbe.
- `DriveConfig`: Antrieb (Motor/Funk/Drehkurbel), Steuerung (Zeit/Wetter/Sensor), Funkprotokoll.
- `SmartHomeBinding`: Zuordnung zu Gateway/Szene, Credentials-Referenz (Core Vault), kein Plain-Secret.
- `ShadingBOM`: Stückliste je Einheit (Behang, Kasten, Antrieb, Sensor), für Einkauf/Preis.
- `InstallationPlan`: Montage-Termin, Anschluss (Strom/Funk), Abnahmekriterien (Funk-Reichweite).

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod, Pfad-Versionierung).

- `POST /api/v1/shading/units` – Beschattungseinheit mit Maßen/Bauart anlegen (Zod `shadingUnitSchema`).
- `POST /api/v1/shading/drives/validate` – Antriebs-/Steuerungsregeln prüfen (Spannung/Funk kompatibel).
- `POST /api/v1/shading/smarthome/bind` – Smart-Home-Zuordnung anlegen (Secret via Core Vault).
- `POST /api/v1/shading/bom/generate` – Stückliste erzeugen.
- `POST /api/v1/shading/installations` – Montage-Termin und Plan zuweisen.

## Kapitel 4 – Events

Versionierte Events über Core Outbox/Queue. `event.name.v1`, tenantId im Header.

- `shading.unit.configured.v1` – Einheit konfiguriert, triggert Preis-/Kompatibilitätsnachweis.
- `shading.drive.invalid.v1` – Regelverletzung, blockiert Angebotserstellung.
- `shading.smarthome.bound.v1` – Smart-Home gebunden, triggert Test-Szene.
- `shading.bom.created.v1` – Stückliste erzeugt, triggert Einkauf (Band 45) und Angebot.
- `shading.installed.v1` – Montage bestätigt, triggert Abnahme/Rechnung (Finance OS).

## Kapitel 5 – Workflows

Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Angebot: Aufmaß → Konfiguration → Regelprüfung → Smart-Home-Bindung → Angebot (Finance OS).
- Beschaffung: BOM → Einkauf (Band 45) → Liefertermin → Wareneingang → Montage-Bereit.
- Montage: Termin → Elektro/Funk-Anschluss → Funk-Test → Abnahme → Mängelprotokoll.
- Reklamation: Mangel (Funk/Behang) → Prüfung → Nachbesserung/Garantie → Dokumentation.

## Kapitel 6 – Agenten

Agenten/Rollen in Band 11 Runtime, keine eigene Agent-Infrastruktur.

- `SonnenschutzBeraterAgent` – schlägt Behang/Antrieb nach Fenster/Nutzung vor.
- `DriveKonfiguratorAgent` – prüft Spannung/Funk-Kompatibilität und erzeugt Steuerungsplan.
- `SmartHomeAgent` – bindet Einheit an Gateway/Szene, führt Funk-Test durch.
- `MontageDisponent` – koordiniert Termine und Elektro-Anschlussgewerke.

## Kapitel 7 – UI

Dashboards/Komponenten als Core-Plugin-Views; keine Fachlogik in Client-Komponenten.

- Konfigurator-View: Maße/Bauart/Behang wählen, Live-Regelprüfung Antrieb.
- Smart-Home-Bindung: Gateway/Szene zuweisen, Secret-Eingabe via Core Vault-Feld.
- BOM-Übersicht: Artikel, Mengen, Beschaffungsstatus, Liefertermine.
- Montage-Kalender: Termine, Funk-Test-Status, Abnahmestatus.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Erfolgs- und Fehlerpfade abdecken.

- Unit: Zod `shadingUnitSchema`, Antriebsregeln (Spannung/Funk), BOM-Aggregation.
- Integration: Konfiguration → Regelprüfung → BOM → Montage-ready End-to-End.
- Security: Cross-Tenant-Zugriff auf `ShadingUnit`/`SmartHomeBinding` muss mit 403 scheitern; Secrets nie im Response.
- UI: Regelprüfung serverseitig, Secret-Eingabe nur an Core Vault, nicht im Client-State.

## Kapitel 9 – Security

Authentifizierung über Core (keine zweite), Autorisierung via `requireApiPermission`, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Permission `shading:unit:write`, `shading:smarthome:write` über Core RBAC.
- Smart-Home-Credentials ausschließlich in Core Vault, referenziert via ID, nie im Log/Response.
- Montage-Partner (extern): Workspace-Scoped Token, reduzierter Scope.
- Audit-Log Pflicht für Smart-Home-Bindungen und Abnahmen (Funk-Reichweite).

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele (Core-Vorgaben).

- Composite-Index `(tenantId, projectId)` auf `ShadingUnit` und `ShadingBOM`.
- Katalog-Artikel read-only cachen (TTL 12h), p95 Ziel < 200ms für BOM-Generierung.
- Smart-Home-Test asynchron via Integration-Layer, nicht im Request-Pfad.
- Funk-Test-Status via Core, p95 Ziel < 300ms für Einheit-Abruf.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Tenant-Isolation-Test grün. 8. Band-16 Plugin-Manifest validiert.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
