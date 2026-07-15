# CarryOS Universe – Band 28
# Masterprompt: Fliesenleger Edition (VOLLSTÄNDIG)

> Band: 28 | Masterprompt: 28.0 | Status: PLANNED | Gruppe: Business Editions I
> Abhängigkeit: Band 10–16 (Core), Band 24 Handwerker Core, keine Core-Fork

> Hinweis: Planungs-Masterprompt. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork. Fliesenleger Edition erweitert Handwerker Core (Band 24) als Konfiguration/Plugin.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Bestehende Systeme werden erweitert, nicht dupliziert. Keine zweite Runtime/Engine/Queue/Finance.

- Baut auf Band-24 Handwerker Core: Fliesen-spezifische Erweiterung via Plugin-Manifest, kein Fork.
- Domänenbereiche: Flächen-/Format-Erfassung, Material (Fliesen, Abdichtung, Fugen), Verlege-Art (Wand/Boden), Aufbau/Schlüter-Profile, Wasserschutz.
- Gewerk-Konfig: Fliesen-Katalog (Format, m²/VPE), Verschnitt-Faktor, DIN 18534 (Abdichtung in Nassräumen).
- Wiederverwendung: Band 14 Finance, Band 11 Agents (Material-Bedarf), Band 13 Growth.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `TileArea` (Raum, Fläche m², Format, Verlege-Richtung), `TileProduct` (Fliese, VPE, Preis/m²).
- `Waterproofing` (Abdichtungsebene nach DIN 18534, Schicht-Angabe), `GroutProfile` (Fuge, Silikon).
- `TileJob` (Boden/Wand, Vorbereitung, Verlegung), `CutWaste` (Verschnitt-Berechnung).
- Erbt `Job`, `Quote`, `Customer` aus Band 24; alle Tabellen mit `tenantId` + `workspaceId`.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `POST /api/v1/tiler/areas` Fläche mit Format-/Richtungs-Zod erfassen.
- `POST /api/v1/tiler/jobs/{id}/calc` Fliesen-/Abdichtungs-Bedarf inkl. Verschnitt berechnen.
- `POST /api/v1/tiler/jobs/{id}/quote` Fliesen-Angebot mit Material + Arbeitszeit generieren.
- `GET /api/v1/tiler/jobs/{id}/report` Verlege-Report (Format, Fugen, Abdichtung).

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `tiler.area.recorded.v1` (Aufmaß → Kalkulations-Trigger).
- `tiler.job.quoted.v1` (Angebot → Growth-Follow-up).
- `tiler.waterproofing.done.v1` (Abdichtung → Freigabe vor Verlegung).
- `tiler.job.completed.v1` (Abnahme → Rechnung via Finance OS).

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Angebots-Lifecycle: Aufmaß → Untergrund-Prüfung → Material-Bedarf → Angebot → Beauftragung.
- Nassraum: Abdichtung (DIN 18534) → Freigabe → Verlegung → Fugen → Abnahme.
- Boden: Estrich-Prüfung → Kleber → Verlegung → Silikon/Fuge → Reinigung.
- Mangel: Undichtigkeit-Befund → Nachbesser (Abdichtung) → Neuverlegung → Freigabe.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `MaterialAgent`: berechnet Fliesen-Bedarf inkl. Verschnitt und Fugen/Abdichtung (freier Tier).
- `LayoutAgent`: schlägt Verlegerichtung/Muster vor aus Fläche + Format.
- `QuoteAgent`: erstellt Material-/Arbeits-Kalkulation aus Aufmaß.
- Rollen: Fliesenlegermeister, Monteur, Kunde (Report-Lesepfad), Einkauf.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- Meister-Dashboard: offene Aufmaße, Material-Bedarf, Auftrags-Liste, Disposition.
- Monteur-View: Aufmaß, Abdichtungs-Protokoll, Verlege-Dokumentation, mobil.
- Kunden-Portal: Fliesen-Auswahl, Angebot, Verlege-Report, Historie.
- Verbrauchs-Report (m²/VPE) aus Core-Chart-Package.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: Verschnitt-Berechnung, Format-Validierung, Abdichtungs-Logik, Zod-Aufmaß.
- Integration: Calc-Idempotenz, Quote→Job-Brücke, Waterproofing-Event-Outbox.
- Security: Tenant-Isolation (Objekt A nicht sichtbar für Tenant B), Kunden-Scope.
- DIN-Tests: Abdichtungs-Pflichten nach DIN 18534 korrekt abgebildet.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Abdichtungs-Protokoll als Nachweis-Dokument (Wasserschaden-Haftung) mit Audit-Log.
- Kunden-Portal isoliert; Fliesen-/Objektdaten nur für zuständigen Meister/Monteur.
- Mängel (Undichtigkeit) verschlüsselt markiert; nur autorisierte Rollen ändern.
- Keine Secrets (Fliesen-Shop-API) im Code/Log; in Core-Vault.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `(tenantId, areaId)`, `(tenantId, jobId)`, `(tenantId, customerId)`.
- Verlege-Report-PDF asynchron; Material-Disposition als Background-Job.
- Material-Bedarf gecached (TTL 10 min) pro `(jobId)`.
- p95 Ziel: Aufmaß-Liste < 100 ms, Material-Kalkulation < 300 ms bei 20 Flächen.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
