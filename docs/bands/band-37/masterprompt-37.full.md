# CarryOS Universe – Band 37
# Masterprompt: Trockenbau (VOLLSTÄNDIG)

> Band: 37 | Masterprompt: 37.0 | Status: PLANNED | Gruppe: Business Editions II
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Branchen-Edition als Plugin/Config auf CarryOS Core. Handwerker Core (Band 24) ist Grundlage. Kein Fork, Tenant-Isolation, Band-10-API-Standard, Audit.

## Kapitel 1 – Architektur

Trockenbau-Edition als registrierte Industry-Edition über Band 16 auf Basis Handwerker Core (Band 24). Flächenplanung, Stücklisten, Ausführung und Abnahme laufen über Core Runtime/EventBus/Finance OS.

- Plugin-Manifest `industry.trockenbau` in Band 16 Registry; lädt Platten-/Profil-/Dämm-Kataloge und Agenten-Rollen.
- Wiederverwendung von Core `Project`/`Offer`/`Measurement`; branchespezifisch nur Extension-Tabellen mit tenantId.
- Flächen-/Mengenberechnung (m², Laufmeter) als regelbasiertes Modul auf Core Rules Engine, keine eigene Kalkulations-Engine.
- Montage- und Gewerk-Planung nutzen Core Scheduler, keine eigene Planungs-Engine.

## Kapitel 2 – Datenmodelle

Tenant-isoliert via tenantId. Trockenbauspezifische Erweiterungen als Extension-Modelle, keine Core-Fork.

- `DrywallArea` (Extension Core Measurement): Wand/Decke/Boden, Fläche m², Höhe, Durchbrüche, Untergrund.
- `DrywallBOM`: Stückliste je Bereich (GKB/GKBI, Profil CW/UW, Dämmung, Spachtel), für Einkauf/Preis.
- `FireProtectionSpec`: BrandSchutz-Klassifizierung (F30–F90), Dokumentationspflicht je Bereich.
- `InstallationPlan`: Montage-Reihenfolge, Anschlussgewerke, Abnahmekriterien.
- `ProgressLog`: Ausführungsfortschritt je Bereich mit Foto-Referenz (Core FileStore).

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod, Pfad-Versionierung).

- `POST /api/v1/drywall/areas` – Trockenbau-Bereich mit Fläche/Typ anlegen (Zod `drywallAreaSchema`).
- `POST /api/v1/drywall/bom/generate` – Stückliste aus Bereichen erzeugen.
- `POST /api/v1/drywall/fire-protection` – BrandSchutz-Klasse je Bereich zuweisen.
- `POST /api/v1/drywall/progress` – Fortschritt mit Foto erfassen.
- `POST /api/v1/drywall/installations` – Montage-Termin und Plan zuweisen.

## Kapitel 4 – Events

Versionierte Events über Core Outbox/Queue. `event.name.v1`, tenantId im Header.

- `drywall.area.measured.v1` – Bereich erfasst, triggert Mengenberechnung.
- `drywall.bom.created.v1` – Stückliste erzeugt, triggert Einkauf (Band 45) und Angebot.
- `drywall.fire-protection.set.v1` – BrandSchutz zugewiesen, triggert Dokumentationspflicht.
- `drywall.progress.updated.v1` – Fortschritt erfasst, Update an Projekt-Dashboard.
- `drywall.installed.v1` – Bereich abgenommen, triggert Rechnung (Finance OS).

## Kapitel 5 – Workflows

Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Planung: Aufmaß → Bereich → Mengenberechnung → Stückliste → Angebot (Finance OS).
- Beschaffung: BOM → Einkauf (Band 45) → Liefertermin → Wareneingang → Montage-Bereit.
- Ausführung: Termin → Montage → Fortschritt → BrandSchutz-Doku → Abnahme.
- Reklamation: Mangel → Prüfung → Nachbesserung → Dokumentation.

## Kapitel 6 – Agenten

Agenten/Rollen in Band 11 Runtime, keine eigene Agent-Infrastruktur.

- `TrockenbauPlanerAgent` – schlägt Platten/Profil/Dämmung nach Bereich und Anforderung vor.
- `MengenAgent` – berechnet m²/Laufmeter und erzeugt Stückliste inkl. Verschnitt.
- `BrandSchutzAgent` – prüft F30–F90-Zuordnung und Dokumentationsvollständigkeit.
- `MontageDisponent` – koordiniert Termine und Anschlussgewerke.

## Kapitel 7 – UI

Dashboards/Komponenten als Core-Plugin-Views; keine Fachlogik in Client-Komponenten.

- Bereichs-Planer: Flächen/Höhen/Durchbrüche erfassen, Live-Mengenberechnung.
- BOM-Übersicht: Artikel, Mengen, Beschaffungsstatus, Liefertermine.
- BrandSchutz-Doku: Klassen je Bereich, offene Dokumentationspflichten.
- Fortschritts-Board: Ausführung je Bereich, Fotos, Abnahmestatus.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Erfolgs- und Fehlerpfade abdecken.

- Unit: Zod `drywallAreaSchema`, Mengenberechnung (Fläche−Durchbrüche+Verschnitt), BrandSchutz-Regeln.
- Integration: Bereich → BOM → Einkauf-Event → Montage-ready End-to-End.
- Security: Cross-Tenant-Zugriff auf `DrywallArea`/`DrywallBOM` muss mit 403 scheitern.
- UI: Mengenberechnung serverseitig, Client nur Anzeige.

## Kapitel 9 – Security

Authentifizierung über Core (keine zweite), Autorisierung via `requireApiPermission`, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Permission `drywall:area:write`, `drywall:bom:write` über Core RBAC.
- Kundenadressen/Grundrisse als PII in Core Vault, Audit bei Export.
- Fremdmontage-Partner: Workspace-Scoped Token, reduzierter Scope.
- Audit-Log Pflicht für BrandSchutz-Zuweisungen und Abnahmen.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele (Core-Vorgaben).

- Composite-Index `(tenantId, projectId)` auf `DrywallArea` und `DrywallBOM`.
- Katalog-Artikel read-only cachen (TTL 12h), p95 Ziel < 200ms für BOM-Generierung.
- BOM-Generierung asynchron via Queue bei großen Projekten, nicht im Request-Pfad.
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
