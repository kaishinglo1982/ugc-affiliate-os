# CarryOS Universe – Band 29
# Masterprompt: Schreiner Edition (VOLLSTÄNDIG)

> Band: 29 | Masterprompt: 29.0 | Status: PLANNED | Gruppe: Business Editions I
> Abhängigkeit: Band 10–16 (Core), Band 24 Handwerker Core, keine Core-Fork

> Hinweis: Planungs-Masterprompt. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork. Schreiner Edition erweitert Handwerker Core (Band 24) als Konfiguration/Plugin.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Bestehende Systeme werden erweitert, nicht dupliziert. Keine zweite Runtime/Engine/Queue/Finance.

- Baut auf Band-24 Handwerker Core: Schreiner-spezifische Erweiterung via Plugin-Manifest, kein Fork.
- Domänenbereiche: Maßanfertigung (Einbauschränke, Türen, Möbel), Holzarten/Material, Werkstatt-Fertigung, Montage-Einsatz, Oberflächen.
- Gewerk-Konfig: Holz-Katalog (Eiche, Buche, MDF), Zuschnitt-Optimierung, Beschlag-/Hardware-Komponenten.
- Wiederverwendung: Band 14 Finance, Band 11 Agents (Zuschnitt-Plan), Band 13 Growth.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `CustomPiece` (Bauteil, Maße, Holzart, Konstruktion), `CutPlan` (Zuschnitt-Optimierung, Reststücke).
- `HardwareItem` (Beschläge, Scharniere, Mengen), `SurfaceFinish` (Lack/Öl/Behandlung).
- `JoineryJob` (Fertigung + Montage), `WorkshopOrder` (Werkstatt-Auftrag je Bauteil).
- Erbt `Job`, `Quote`, `Customer` aus Band 24; alle Tabellen mit `tenantId` + `workspaceId`.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `POST /api/v1/joinery/pieces` Bauteil mit Maß-/Holzart-Zod erfassen.
- `POST /api/v1/joinery/jobs/{id}/cutplan` Zuschnitt-Plan mit Reststück-Optimierung erzeugen.
- `POST /api/v1/joinery/jobs/{id}/quote` Schreiner-Angebot (Material + Fertigung + Montage) generieren.
- `GET /api/v1/joinery/jobs/{id}/spec` Fertigungs-Spezifikation (Maße, Beschläge, Oberfläche).

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `joinery.piece.defined.v1` (Bauteil → CutPlan-Trigger).
- `joinery.workshop.ordered.v1` (Werkstatt-Auftrag → Material-Disposition).
- `joinery.job.completed.v1` (Montage-Abnahme → Rechnung via Finance OS).
- `joinery.cut.optimized.v1` (Reststück-Nutzung → Kosten-Ersparnis-Report).

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Angebots-Lifecycle: Maßnahme → Konstruktion → Material-Bedarf → Angebot → Beauftragung.
- Fertigung: Zuschnitt → Bearbeitung → Oberfläche → Qualitätscheck → Verpackung.
- Montage: Lieferung → Einbau → Justierung → Abnahme vor Ort.
- Mangel: Passungs-Befund → Nacharbeit Werkstatt → Remontage → Freigabe.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `CutAgent`: optimiert Zuschnitt/Brett-Ausnutzung inkl. Reststück-Verwaltung (freier Tier).
- `QuoteAgent`: kalkuliert Material + Fertigungs-/Montagezeit aus Bauteil-Maßen.
- `SpecAgent`: erzeugt Fertigungs-Spezifikation aus Bauteil-Definition.
- Rollen: Schreinermeister, Werkstatt, Monteur, Kunde (Spez-Lesepfad).

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- Meister-Dashboard: offene Bauteile, Werkstatt-Auslastung, Material-Bedarf, Termine.
- Werkstatt-View: Zuschnitt-Plan, Bauteil-Checkliste, Oberflächen-Dokumentation.
- Kunden-Portal: Maß-Visualisierung, Angebot, Fertigungs-Spez, Abnahmeprotokoll.
- Material-/Reststück-Report aus Core-Chart-Package.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: Zuschnitt-Optimierung, Maß-Validierung, Material-Bedarf, Zod-Bauteil.
- Integration: CutPlan-Idempotenz, Quote→Job-Brücke, Workshop-Event-Outbox.
- Security: Tenant-Isolation (Objekt A nicht sichtbar für Tenant B), Kunden-Scope.
- Reststück-Logik: Optimierung reduziert Verschnitt korrekt (Test-Datensatz).

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Fertigungs-Spezifikationen als Nachweis-Dokumente mit Audit-Log (Maß-Haftung).
- Kunden-Portal isoliert; Bauteil-/Objektdaten nur für zuständigen Meister/Werkstatt.
- Passungs-Mängel verschlüsselt markiert; nur autorisierte Rollen ändern.
- Keine Secrets (Holz-Shop-API, CAD-Tool) im Code/Log; in Core-Vault.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `(tenantId, pieceId)`, `(tenantId, jobId)`, `(tenantId, customerId)`.
- Spez-PDF asynchron; Zuschnitt-Optimierung als Background-Job bei großen Aufträgen.
- Material-Bedarf gecached (TTL 10 min) pro `(jobId)`.
- p95 Ziel: Bauteil-Liste < 100 ms, CutPlan < 400 ms bei 50 Bauteilen.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
