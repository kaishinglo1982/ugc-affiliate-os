# CarryOS Universe – Band 27
# Masterprompt: Maler Edition (VOLLSTÄNDIG)

> Band: 27 | Masterprompt: 27.0 | Status: PLANNED | Gruppe: Business Editions I
> Abhängigkeit: Band 10–16 (Core), Band 24 Handwerker Core, keine Core-Fork

> Hinweis: Planungs-Masterprompt. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork. Maler Edition erweitert Handwerker Core (Band 24) als Konfiguration/Plugin.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Bestehende Systeme werden erweitert, nicht dupliziert. Keine zweite Runtime/Engine/Queue/Finance.

- Baut auf Band-24 Handwerker Core: Maler-spezifische Erweiterung via Plugin-Manifest, kein Fork.
- Domänenbereiche: Flächen-/Raum-Erfassung, Farb- und Material-Kalkulation, Untergrund-Beurteilung, Tapezier-/Putz-Arbeiten, Fassaden-Beschichtung.
- Gewerk-Konfig: Farb-Katalog, Deckkraft-/Verbrauchs-Kennzahlen, RAL-Referenzen, VOC-/Umweltklassen.
- Wiederverwendung: Band 14 Finance, Band 11 Agents (Verbrauchs-Kalkulation), Band 13 Growth.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `RoomSurface` (Raum/Fläche, Wand/Decke, m², Untergrund), `ColorSpec` (Farbton, Gebinde, Anzahl).
- `PaintJob` (Innen/Fassade, Vorbereitung, Beschichtung), `SubstrateAssessment` (Untergrund-Befund).
- `MaterialConsumption` (Farbe/Liter, Verbrauch je m²), `FinishReport` (Schicht-Angaben, Trocknung).
- Erbt `Job`, `Quote`, `Customer` aus Band 24; alle Tabellen mit `tenantId` + `workspaceId`.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `POST /api/v1/painter/surfaces` Raum/Fläche mit Untergrund-Zod erfassen.
- `POST /api/v1/painter/jobs/{id}/calc` Farb-/Material-Bedarf aus Fläche + Deckkraft berechnen.
- `POST /api/v1/painter/jobs/{id}/quote` Maler-Angebot mit Schicht-Kalkulation generieren.
- `GET /api/v1/painter/jobs/{id}/finish` Abschlussbericht (Schichten, Farbtöne, Verbrauch).

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `painter.surface.recorded.v1` (Flächen-Erfassung → Kalkulations-Trigger).
- `painter.job.quoted.v1` (Angebot → Growth-Follow-up).
- `painter.job.completed.v1` (Abnahme → Rechnung via Finance OS).
- `painter.substrate.issue.v1` (Untergrund-Mangel → Vorbereitungs-Auftrag).

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Angebots-Lifecycle: Aufmaß → Untergrund-Prüfung → Farb-Kalkulation → Angebot → Beauftragung.
- Ausführung: Vorbereitung (Grundierung) → 1./2. Beschichtung → Trocknung → Abnahme.
- Fassaden: Gerüst-Koordination → Untergrund → Beschichtung → Reinigung → Freigabe.
- Mangel: Untergrund-Befund → Nachbesser (Spachteln) → Neubeschichtung → Freigabe.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `ConsumptionAgent`: berechnet Farb-/Material-Bedarf inkl. Verschnitt aus Fläche + Deckkraft.
- `ColorAgent`: schlägt Farbtöne/Kombinationen vor (freier Tier, keine Premium-Bild-KI).
- `QuoteAgent`: erstellt Schicht-/Arbeits-Kalkulation aus Aufmaß.
- Rollen: Malermeister, Monteur, Kunde (Bericht-Lesepfad), Einkauf.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- Meister-Dashboard: offene Aufmaße, Farb-Bedarf, Auftrags-Liste, Material-Disposition.
- Monteur-View: Aufmaß-Erfassung, Schicht-Protokoll, Farb-Dokumentation, mobil.
- Kunden-Portal: Farb-Vorschau (RAL), Angebot, Abschlussbericht, Historie.
- Verbrauchs-Report (Liter/m²) aus Core-Chart-Package.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: Verbrauchs-Berechnung, Deckkraft-Logik, Schicht-Kalkulation, Zod-Aufmaß.
- Integration: Calc-Idempotenz, Quote→Job-Brücke, Finish-Event-Outbox.
- Security: Tenant-Isolation (Objekt A nicht sichtbar für Tenant B), Kunden-Scope.
- Farb-Katalog-Tests: RAL-Referenzen und VOC-Klassen korrekt validiert.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Abschlussberichte als Nachweis-Dokumente mit Audit-Log (Gewährleistung Farbe).
- Kunden-Portal isoliert; Farb-/Objektdaten nur für zuständigen Meister/Monteur.
- Untergrund-Mängel verschlüsselt markiert; nur autorisierte Rollen ändern.
- Keine Secrets (Farblabor-API, Gerüst-Vermieter) im Code/Log; in Core-Vault.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `(tenantId, surfaceId)`, `(tenantId, jobId)`, `(tenantId, customerId)`.
- Abschlussbericht-PDF asynchron; Material-Disposition als Background-Job.
- Farb-Bedarf gecached (TTL 10 min) pro `(jobId)`.
- p95 Ziel: Aufmaß-Liste < 100 ms, Farb-Kalkulation < 300 ms bei 30 Flächen.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
