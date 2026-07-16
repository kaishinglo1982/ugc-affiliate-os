# CarryOS Universe – Band 39
# Masterprompt: Zimmerer (VOLLSTÄNDIG)

> Band: 39 | Masterprompt: 39.0 | Status: PLANNED | Gruppe: Business Editions II
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Branchen-Edition als Plugin/Config auf CarryOS Core. Handwerker Core (Band 24) ist Grundlage. Kein Fork, Tenant-Isolation, Band-10-API-Standard, Audit.

## Kapitel 1 – Architektur

Zimmerer-Edition als registrierte Industry-Edition über Band 16 auf Basis Handwerker Core (Band 24). Holzbau-Konstruktion, Statik, Fertigung und Montage laufen über Core Runtime/EventBus/Finance OS.

- Plugin-Manifest `industry.zimmerer` in Band 16 Registry; lädt Holz/Sparren-/Element-Kataloge und Agenten-Rollen.
- Wiederverwendung von Core `Project`/`Offer`/`Measurement`; branchespezifisch nur Extension-Tabellen mit tenantId.
- Holzbau-Statik (Lasten, Querschnitte) als regelbasiertes Modul auf Core Rules Engine, keine eigene Berechnungs-Engine.
- Fertigungs- (Elementbau) und Montageplanung nutzen Core Scheduler, keine eigene Planungs-Engine.

## Kapitel 2 – Datenmodelle

Tenant-isoliert via tenantId. Zimmererspezifische Erweiterungen als Extension-Modelle, keine Core-Fork.

- `TimberComponent` (Extension Core Measurement): Holzart, Querschnitt, Länge, Menge, Verbindung (Zapfen/Nagelplatte).
- `RoofStructure`: Dachgeometrie (Sparren, Pfetten, Neigung), Lastannahmen (Schnee/Wind nach Region).
- `TimberBOM`: Stückliste je Bauteil (Holz, Verbindungsmittel, Dämmung), für Einkauf/Preis.
- `StructuralCheck`: Holzbau-Nachweis-Referenz, Prüfstatus, Dokumentationspflicht.
- `AssemblyPlan`: Montage-Reihenfolge, Kran-Einsatz, Abnahmekriterien.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod, Pfad-Versionierung).

- `POST /api/v1/timber/components` – Holzbauteil mit Querschnitt/Länge anlegen (Zod `timberComponentSchema`).
- `POST /api/v1/timber/structural/validate` – Holzbau-Statik prüfen (Last/Querschnitt).
- `POST /api/v1/timber/bom/generate` – Stückliste erzeugen.
- `POST /api/v1/timber/roofs` – Dachgeometrie mit Lastannahmen erfassen.
- `POST /api/v1/timber/assembly` – Montage-Termin und Plan zuweisen.

## Kapitel 4 – Events

Versionierte Events über Core Outbox/Queue. `event.name.v1`, tenantId im Header.

- `timber.component.designed.v1` – Bauteil konstruiert, triggert Statik-Prüfung.
- `timber.structural.failed.v1` – Statikregel verletzt, blockiert Freigabe.
- `timber.bom.created.v1` – Stückliste erzeugt, triggert Einkauf (Band 45) und Angebot.
- `timber.assembled.v1` – Montage bestätigt, triggert Abnahme/Rechnung (Finance OS).
- `timber.maintenance.due.v1` – Holzschutz-Wartung fällig, Serviceauftrag.

## Kapitel 5 – Workflows

Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Konstruktion: Aufmaß → Bauteil/Dach → Statik-Check → Freigabe → Stückliste.
- Beschaffung: BOM → Einkauf (Band 45) → Liefertermin → Wareneingang → Fertigung-Bereit.
- Montage: Termin → Kran/Elementbau → Einbau → Abnahme → Mängelprotokoll.
- Wartung: Holzschutz-Check → Nachbehandlung → Dokumentation.

## Kapitel 6 – Agenten

Agenten/Rollen in Band 11 Runtime, keine eigene Agent-Infrastruktur.

- `ZimmererKonstrukteurAgent` – schlägt Holzart/Querschnitt nach Last und Geometrie vor.
- `HolzbauStatikAgent` – prüft Lastannahmen und erzeugt Nachweis-Referenz.
- `MengenAgent` – aggregiert Holz/Verbindungsmittel zu Stückliste inkl. Verschnitt.
- `MontageDisponent` – koordiniert Termine, Kran-Einsatz, Anschlussgewerke.

## Kapitel 7 – UI

Dashboards/Komponenten als Core-Plugin-Views; keine Fachlogik in Client-Komponenten.

- Konstruktions-View: Holzart/Querschnitt/Verbindung wählen, Live-Statik-Prüfung.
- Dach-Planer: Geometrie/Neigung/Lastannahmen erfassen, Regel-Check.
- BOM-Übersicht: Artikel, Mengen, Beschaffungsstatus, Liefertermine.
- Montage-Kalender: Termine, Kran-Einsatz, Abnahmestatus.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Erfolgs- und Fehlerpfade abdecken.

- Unit: Zod `timberComponentSchema`, Statik-Regeln (Schnee/Wind-Region), BOM-Aggregation.
- Integration: Konstruktion → Statik-Check → BOM → Montage-ready End-to-End.
- Security: Cross-Tenant-Zugriff auf `TimberComponent`/`TimberBOM` muss mit 403 scheitern.
- UI: Statik-Prüfung serverseitig, Client nur Anzeige.

## Kapitel 9 – Security

Authentifizierung über Core (keine zweite), Autorisierung via `requireApiPermission`, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Permission `timber:component:write`, `timber:bom:write` über Core RBAC.
- Lastannahmen/Kundenadressen als PII in Core Vault, Audit bei Export.
- Fremdmontage-Partner: Workspace-Scoped Token, reduzierter Scope.
- Audit-Log Pflicht für Statik-Freigaben und Abnahmen (Haftung).

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele (Core-Vorgaben).

- Composite-Index `(tenantId, projectId)` auf `TimberComponent` und `TimberBOM`.
- Statik-Regel-Cache (TTL, regional), p95 Ziel < 200ms für Validierung.
- BOM-Generierung asynchron via Queue, nicht im Request-Pfad.
- Dach-Geometrie via Core GeoService, p95 Ziel < 300ms für Bauteil-Abruf.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Tenant-Isolation-Test grün. 8. Band-16 Plugin-Manifest validiert.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
