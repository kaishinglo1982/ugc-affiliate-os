# CarryOS Universe – Band 30
# Masterprompt: Maurer Edition (VOLLSTÄNDIG)

> Band: 30 | Masterprompt: 30.0 | Status: PLANNED | Gruppe: Business Editions I
> Abhängigkeit: Band 10–16 (Core), Band 24 Handwerker Core, keine Core-Fork

> Hinweis: Planungs-Masterprompt. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork. Maurer Edition erweitert Handwerker Core (Band 24) als Konfiguration/Plugin.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Bestehende Systeme werden erweitert, nicht dupliziert. Keine zweite Runtime/Engine/Queue/Finance.

- Baut auf Band-24 Handwerker Core: Maurer-spezifische Erweiterung via Plugin-Manifest, kein Fork.
- Domänenbereiche: Mauern/Beton-Arbeiten, Putz, Fundament/Estrich, Material (Stein, Mörtel, Beton), Statik-relevante Nachweise.
- Gewerk-Konfig: Stein-/Mörtel-Katalog, Mischungs-Verhältnisse, Flächen-/Volumen-Berechnung, DIN-Bezüge.
- Wiederverwendung: Band 14 Finance, Band 11 Agents (Volumen-Kalkulation), Band 13 Growth.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `MasonryUnit` (Wand, Länge/Höhe/Dicke, Steinart), `ConcreteElement` (Fundament, Volumen m³).
- `MixSpec` (Mörtel/Beton-Mischung, Verhältnis), `RenderLayer` (Putz-Schicht, Stärke).
- `MasonryJob` (Mauerwerk, Estrich, Putz), `MaterialVolume` (Stein/Mörtel/Beton-Bedarf).
- Erbt `Job`, `Quote`, `Customer` aus Band 24; alle Tabellen mit `tenantId` + `workspaceId`.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `POST /api/v1/mason/units` Mauerwerk mit Abmessungs-Zod erfassen.
- `POST /api/v1/mason/jobs/{id}/calc` Stein-/Mörtel-/Beton-Bedarf aus Volumen berechnen.
- `POST /api/v1/mason/jobs/{id}/quote` Maurer-Angebot (Material + Arbeitszeit) generieren.
- `GET /api/v1/mason/jobs/{id}/report` Ausführungs-Report (Schichten, Mischung, Abnahme).

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `mason.unit.defined.v1` (Mauerwerk → Volumen-Kalkulations-Trigger).
- `mason.job.quoted.v1` (Angebot → Growth-Follow-up).
- `mason.concrete.poured.v1` (Beton-Abnahme → Statik-Nachweis-Referenz).
- `mason.job.completed.v1` (Abnahme → Rechnung via Finance OS).

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Angebots-Lifecycle: Aufmaß → Volumen-Bedarf → Material-Kalkulation → Angebot → Beauftragung.
- Mauerwerk: Fundament → Mauern → Putz → Abnahme.
- Estrich/Beton: Vorbereitung → Einbringen → Nachbehandlung → Festigkeits-Abnahme.
- Mangel: Riss-/Setzungs-Befund → Nachbesser (Injektion/Verputz) → Freigabe.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `VolumeAgent`: berechnet Stein-/Mörtel-/Beton-Bedarf aus Abmessungen (freier Tier).
- `QuoteAgent`: kalkuliert Material + Arbeitszeit aus Volumen/Aufmaß.
- `ScheduleAgent`: plant Betonier-Termine mit Wetter-/Trocknungs-Fenster.
- Rollen: Poliermeister, Maurer, Kunde (Report-Lesepfad), Statiker (eingeschränkt).

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- Meister-Dashboard: offene Aufmaße, Material-Bedarf, Beton-Terminkalender, Aufträge.
- Monteur-View: Aufmaß, Mischungs-Protokoll, Schicht-Dokumentation, mobil.
- Kunden-Portal: Angebot, Ausführungs-Report, Abnahmeprotokoll, Historie.
- Material-/Volumen-Report (m³) aus Core-Chart-Package.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: Volumen-Berechnung, Mischungs-Logik, Putz-Stärken, Zod-Aufmaß.
- Integration: Calc-Idempotenz, Quote→Job-Brücke, Concrete-Event-Outbox.
- Security: Tenant-Isolation (Objekt A nicht sichtbar für Tenant B), Kunden-Scope.
- Statik-Sicht: nur freigegebene Beton-Nachweise, keine Kundendaten-Leak.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Ausführungs-Report als Nachweis-Dokument (Statik/Beton-Haftung) mit Audit-Log.
- Kunden-Portal isoliert; Objektdaten nur für zuständigen Meister/Monteur.
- Riss-/Setzungs-Mängel verschlüsselt markiert; nur autorisierte Rollen ändern.
- Statiker-Rolle mit eingeschränktem Lesepfad; keine Secrets (Wetter-API) im Code/Log.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `(tenantId, unitId)`, `(tenantId, jobId)`, `(tenantId, customerId)`.
- Ausführungs-Report-PDF asynchron; Material-Disposition als Background-Job.
- Volumen-Bedarf gecached (TTL 10 min) pro `(jobId)`.
- p95 Ziel: Aufmaß-Liste < 100 ms, Volumen-Kalkulation < 300 ms bei 30 Einheiten.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
