# CarryOS Universe – Band 36
# Masterprompt: Metallbau (VOLLSTÄNDIG)

> Band: 36 | Masterprompt: 36.0 | Status: PLANNED | Gruppe: Business Editions II
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Branchen-Edition als Plugin/Config auf CarryOS Core. Handwerker Core (Band 24) ist Grundlage. Kein Fork, Tenant-Isolation, Band-10-API-Standard, Audit.

## Kapitel 1 – Architektur

Metallbau-Edition als registrierte Industry-Edition über Band 16 auf Basis Handwerker Core (Band 24). Konstruktion, Fertigung, Korrosionsschutz und Montage laufen über Core Runtime/EventBus/Finance OS.

- Plugin-Manifest `industry.metallbau` in Band 16 Registry; lädt Stahl/Aluminium-Profile, Beschlag- und Norm-Kataloge und Agenten-Rollen.
- Wiederverwendung von Core `Project`/`Offer`/`Measurement`; branchespezifisch nur Extension-Tabellen mit tenantId.
- Statik-/Tragwerksprüfung als regelbasiertes Modul auf Core Rules Engine, keine eigene Berechnungs-Engine.
- Fertigungs- und Montageplanung nutzen Core Scheduler, keine eigene Planungs-Engine.

## Kapitel 2 – Datenmodelle

Tenant-isoliert via tenantId. Metallbauspezifische Erweiterungen als Extension-Modelle, keine Core-Fork.

- `MetalComponent` (Extension Core Measurement): Material (Stahl/Aluminium/Edelstahl), Profil, Schnittmaße, Menge, Schweißnaht-Klasse.
- `CorrosionSpec`: Korrosionsschutzklasse (C1–C5), Beschichtung, Norm (DIN EN ISO 12944).
- `FabricationOrder`: Werkauftrag je Komponente, Status (Zuschnitt/Schweißen/Beschichten/Montage-ready).
- `StructuralCheck`: Tragwerksnachweis-Referenz, Lastannahmen, Prüfstatus.
- `InstallationPlan`: Montage-Reihenfolge, Anschlüsse, Abnahmekriterien (z. B. TRBS).

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod, Pfad-Versionierung).

- `POST /api/v1/metal/components` – Metallbauteil mit Material/Maßen anlegen (Zod `metalComponentSchema`).
- `POST /api/v1/metal/structural/validate` – Tragwerksregeln prüfen (Last/Klasse).
- `POST /api/v1/metal/fabrication-orders` – Werkauftrag aus Komponente erzeugen.
- `POST /api/v1/metal/corrosion-specs` – Korrosionsschutzklasse zuweisen.
- `POST /api/v1/metal/installations` – Montage-Termin und Plan zuweisen.

## Kapitel 4 – Events

Versionierte Events über Core Outbox/Queue. `event.name.v1`, tenantId im Header.

- `metal.component.designed.v1` – Bauteil konstruiert, triggert Statik-Prüfung.
- `metal.structural.failed.v1` – Tragwerksregel verletzt, blockiert Freigabe.
- `metal.fabrication.ready.v1` – Werkauftrag fertig, triggert Montage-Disposition.
- `metal.installed.v1` – Montage bestätigt, triggert Abnahme/Rechnung (Finance OS).
- `metal.corrosion.due.v1` – Wartungsintervall Korrosionsschutz erreicht, Serviceauftrag.

## Kapitel 5 – Workflows

Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Konstruktion: Aufmaß → Bauteil → Statik-Check → Freigabe → Werkauftrag.
- Fertigung: Zuschnitt → Schweißen → Beschichten (C-Klasse) → QC → Montage-ready.
- Montage: Termin → Anschlüsse → Einbau → Abnahme (TRBS) → Mängelprotokoll.
- Wartung: Korrosions-Check → Nachbeschichtung → Dokumentation.

## Kapitel 6 – Agenten

Agenten/Rollen in Band 11 Runtime, keine eigene Agent-Infrastruktur.

- `MetallKonstrukteurAgent` – schlägt Profile/Material nach Last und Korrosionsklasse vor.
- `StatikAgent` – prüft Tragwerksregeln und erzeugt Nachweis-Referenz.
- `FertigungsPlanerAgent` – plant Werkaufträge und Beschichtungsintervalle.
- `MontageDisponent` – koordiniert Termine und Anschlussgewerke.

## Kapitel 7 – UI

Dashboards/Komponenten als Core-Plugin-Views; keine Fachlogik in Client-Komponenten.

- Konstruktions-View: Material/Profil/Schweißklasse wählen, Live-Statik-Prüfung.
- Fertigungsboard: Werkaufträge je Status, Korrosionsklasse, Engpässe.
- Korrosions-Wartungsplan: Intervalle je Objekt/Komponente, offene Maßnahmen.
- Montage-Kalender: Termine, Anschlüsse, Abnahmestatus.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Erfolgs- und Fehlerpfade abdecken.

- Unit: Zod `metalComponentSchema`, Statik-Regeln, Korrosionsklassen-Zuordnung.
- Integration: Konstruktion → Statik-Check → Werkauftrag → ready-Event End-to-End.
- Security: Cross-Tenant-Zugriff auf `MetalComponent`/`FabricationOrder` muss mit 403 scheitern.
- UI: Statik-Prüfung serverseitig, Client nur Anzeige.

## Kapitel 9 – Security

Authentifizierung über Core (keine zweite), Autorisierung via `requireApiPermission`, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Permission `metal:component:write`, `metal:fabrication:write` über Core RBAC.
- Lastannahmen/Kundenadressen als PII in Core Vault, Audit bei Export.
- Fremdmontage-Partner: Workspace-Scoped Token, reduzierter Scope.
- Audit-Log Pflicht für Statik-Freigaben und Abnahmen (TRBS/Haftung).

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele (Core-Vorgaben).

- Composite-Index `(tenantId, projectId)` auf `MetalComponent` und `FabricationOrder`.
- Statik-Regel-Cache (TTL), p95 Ziel < 200ms für Validierung.
- Fertigungsstatus-Updates asynchron via Queue, nicht im Request-Pfad.
- Korrosions-Wartungsplan via Scheduler, p95 Ziel < 300ms für Komponenten-Abruf.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Tenant-Isolation-Test grün. 8. Band-16 Plugin-Manifest validiert.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
