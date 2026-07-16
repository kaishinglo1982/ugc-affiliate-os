# CarryOS Universe – Band 35
# Masterprompt: Küchenbauer (VOLLSTÄNDIG)

> Band: 35 | Masterprompt: 35.0 | Status: PLANNED | Gruppe: Business Editions II
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Branchen-Edition als Plugin/Config auf CarryOS Core. Handwerker Core (Band 24) ist Grundlage. Kein Fork, Tenant-Isolation, Band-10-API-Standard, Audit.

## Kapitel 1 – Architektur

Küchenbauer-Edition als registrierte Industry-Edition über Band 16 auf Basis Handwerker Core (Band 24). Planung, Konfiguration, Fertigung und Montage laufen über Core Runtime/EventBus/Finance OS.

- Plugin-Manifest `industry.kuechenbauer` in Band 16 Registry; lädt Korpus-/Front-/Arbeitsplatten-Kataloge und Agenten-Rollen.
- Wiederverwendung von Core `Project`/`Offer`/`Measurement`; branchespezifisch nur Extension-Tabellen mit tenantId.
- 2D/3D-Raumplanung als Plugin-View auf Core GeoService, keine eigene Rendering-Engine.
- Stücklisten-Generierung (BOM) über Core Rules Engine, gekoppelt an Einkauf (Band 45) und Finance OS.

## Kapitel 2 – Datenmodelle

Tenant-isoliert via tenantId. Küchenbauerspezifische Erweiterungen als Extension-Modelle, keine Core-Fork.

- `KitchenRoom` (Extension Core Measurement): Raummaße, Anschlüsse (Wasser/Strom/Abluft), Fenster/Sockel.
- `CabinetUnit`: Korpus, Front, Maße, Auszüge, Hardware (Schiene, Dämpfung) mit Artikelreferenz.
- `Countertop`: Material (Granit/Quarz/Laminat), Zuschnittmaße, Ausschnitte (Spüle/Herd).
- `KitchenBOM`: Stückliste je Küche, aggregiert Artikel aus Katalog + Zuschnitt, für Einkauf/Preis.
- `InstallationPlan`: Montage-Reihenfolge, Elektro-/Sanitär-Schnittstellen, Abnahmekriterien.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod, Pfad-Versionierung).

- `POST /api/v1/kitchen/rooms` – Raum mit Anschlüssen/Maßen anlegen (Zod `kitchenRoomSchema`).
- `POST /api/v1/kitchen/cabinets` – Küchenmöbel mit Hardware konfigurieren.
- `POST /api/v1/kitchen/bom/generate` – Stückliste aus Konfiguration erzeugen.
- `POST /api/v1/kitchen/installations` – Montage-Termin und Plan zuweisen.
- `GET /api/v1/kitchen/rooms/{id}/render` – 2D/3D-Vorschau-Link (Core GeoService).

## Kapitel 4 – Events

Versionierte Events über Core Outbox/Queue. `event.name.v1`, tenantId im Header.

- `kitchen.room.measured.v1` – Raum erfasst, triggert Konfigurationsstart.
- `kitchen.config.finalized.v1` – Planung freigegeben, triggert BOM + Angebot (Finance OS).
- `kitchen.bom.created.v1` – Stückliste erzeugt, triggert Einkauf (Band 45) und Beschaffung.
- `kitchen.installed.v1` – Montage bestätigt, triggert Abnahme/Rechnung.
- `kitchen.bom.mismatch.v1` – Artikelfehler, blockiert Freigabe bis Korrektur.

## Kapitel 5 – Workflows

Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Planung: Aufmaß → Raum → Korpus/Front-Konfig → 3D-Check → Freigabe → BOM.
- Beschaffung: BOM → Einkauf (Band 45) → Liefertermin → Wareneingang → Montage-Bereit.
- Montage: Termin → Elektro/Sanitär-Abstimmung → Einbau → Abnahme → Mängelprotokoll.
- Reklamation: Mangel → Prüfung → Nachbesserung/Garantie → Dokumentation.

## Kapitel 6 – Agenten

Agenten/Rollen in Band 11 Runtime, keine eigene Agent-Infrastruktur.

- `KuechenPlanerAgent` – schlägt Korpus/Front/Arbeitsplatte nach Raum und Budget vor.
- `BOM_Agent` – generiert Stückliste und prüft Artikelverfügbarkeit/Einkaufspreise.
- `MontageDisponent` – koordiniert Termine und Gewerke-Schnittstellen.
- `EinrichtungsBeraterAgent` – empfiehlt Zubehör/Upgrade aus Katalog (Upsell).

## Kapitel 7 – UI

Dashboards/Komponenten als Core-Plugin-Views; keine Fachlogik in Client-Komponenten.

- Raum-Planer: Maße/Anschlüsse erfassen, 2D/3D-Vorschau (Core GeoService-View).
- Konfigurator: Korpus/Front/Arbeitsplatte wählen, Live-Preis aus BOM.
- BOM-Übersicht: Artikel, Mengen, Beschaffungsstatus, Liefertermine.
- Montage-Kalender: Termine, Gewerke, Abnahmestatus.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Erfolgs- und Fehlerpfade abdecken.

- Unit: Zod `kitchenRoomSchema`, BOM-Aggregation, Hardware-Kompatibilitätsregeln.
- Integration: Planung → BOM → Einkauf-Event → Montage-ready End-to-End.
- Security: Cross-Tenant-Zugriff auf `KitchenRoom`/`KitchenBOM` muss mit 403 scheitern.
- UI: 3D-Vorschau nutzt Core-Service, keine Berechnung im Client.

## Kapitel 9 – Security

Authentifizierung über Core (keine zweite), Autorisierung via `requireApiPermission`, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Permission `kitchen:room:write`, `kitchen:bom:write` über Core RBAC.
- Kundenadressen/Grundrisse als PII in Core Vault, Audit bei Export.
- Montage-Partner (extern): Workspace-Scoped Token, reduzierter Scope.
- Audit-Log Pflicht für Planungsfreigaben und Abnahmen.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele (Core-Vorgaben).

- Composite-Index `(tenantId, projectId)` auf `CabinetUnit` und `KitchenBOM`.
- Katalog-Artikel read-only cachen (TTL 12h), p95 Ziel < 200ms für BOM-Generierung.
- BOM-Generierung asynchron via Queue bei großen Küchen, nicht im Request-Pfad.
- 3D-Render-Link via Core GeoService, p95 Ziel < 300ms für Raum-Abruf.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Tenant-Isolation-Test grün. 8. Band-16 Plugin-Manifest validiert.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
