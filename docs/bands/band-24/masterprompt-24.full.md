# CarryOS Universe – Band 24
# Masterprompt: Handwerker Core (VOLLSTÄNDIG)

> Band: 24 | Masterprompt: 24.0 | Status: PLANNED | Gruppe: Business Editions I
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Planungs-Masterprompt. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork. Handwerker Core ist die Basis-Edition für Gewerke 25–30, distributioniert als Plugin/Preset.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Bestehende Systeme werden erweitert, nicht dupliziert. Keine zweite Runtime/Engine/Queue/Finance.

- Edition als Plugin-Preset über Band-16 Factory: Basis-Gewerk-Domäne (Aufträge, Angebote, Einsätze) als Fundament für Bänder 25–30.
- Domänenbereiche: Kundenadresse, Angebotserstellung, Auftragsannahme, Einsatzplanung/Disposition, Material-Erfassung, Mängelbericht.
- Wiederverwendung: Band 14 Finance (Rechnung, Zahlung), Band 13 Growth (Lead/Anfrage), Band 11 Agents (Disposition).
- Gewerk-spezifische Erweiterungen (Elektro, Dach etc.) erben von diesem Core via Konfiguration, kein Fork.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `Customer` (Auftraggeber, Adresse, Ansprechpartner), `Quote` (Positionen, Material, Arbeitszeit).
- `Job` (Auftrag mit Status Anfrage→Angebot→Beauftragt→Ausführung→Abnahme), `JobPosition` (Einzelposten).
- `Dispatch` (Monteur/Einsatz-Zuweisung, Zeitfenster), `MaterialLine` (Artikel, Menge, Einheit).
- `DefectReport` (Mangel-Befund, Foto-Referenz), alle Tabellen mit `tenantId` + `workspaceId` + Audit-Mixin.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `POST /api/v1/trades/quotes` Angebot mit Positions-Zod (Material + Zeit) erstellen.
- `POST /api/v1/trades/jobs/{id}/accept` Auftrag annehmen, Status-Transition validiert.
- `POST /api/v1/trades/jobs/{id}/dispatch` Monteur-Zuweisung mit Verfügbarkeitsprüfung.
- `POST /api/v1/trades/jobs/{id}/defectreport` Mängelbericht anlegen (Foto-Referenz, Befund).

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `trades.quote.created.v1` (Angebots-Versand, Growth-Follow-up bei Nicht-Rückmeldung).
- `trades.job.accepted.v1` (Auftragsbestätigung, Finance-Projektangelegt).
- `trades.job.completed.v1` (Abnahme → Rechnungsstellung via Finance OS).
- `trades.defect.reported.v1` (Mangel → Wartungs-Workflow / Nachbesserung).

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Angebots-Lifecycle: Anfrage → Kalkulation → Angebot → Kunde-Annahme → Auftrag.
- Einsatz-Disposition: Job → Monteur-Zuweisung → Routen-Slot → Durchführung → Abnahme.
- Material-Erfassung: Entnahme → Lager-Buchung → Kosten-Zuordnung zum Job.
- Mängel-Handling: Meldung → Bewertung → Nachbesser-Termin → Freigabe.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `QuoteAgent`: schlägt Material-/Zeit-Kalkulation aus historischen Jobs vor (freier Tier).
- `DispatchAgent`: optimiert Monteur-Zuweisung nach Standort/Skill/Zeitfenster.
- `ReminderAgent`: erinnert an fällige Angebote und offene Abnahmen.
- Rollen: Disponent, Monteur (mobiler Pfad), Kunde (Portal-Lesepfad), Buchhaltung.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- Dispositions-Board: offene Jobs, Monteur-Auslastung, Einsatz-Kalender.
- Monteur-App-View: Tagesaufträge, Checklisten, Material-Erfassung, Mängel-Foto.
- Kunden-Portal: Angebotsstatus, Termine, Abnahmeprotokoll, Rechnungen.
- Reports aus Core-Chart-Package (Umsatz/Jobs pro Gewerk).

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: Angebots-Kalkulation, Status-Transition-Matrix, Material-Buchung, Zod-Positionen.
- Integration: Job-Accept-Idempotenz, Dispatch-Konflikt, Defect-Event-Outbox.
- Security: Tenant-Isolation (Kunde A sieht nicht Job B), Monteur-Scope auf eigene Einsätze.
- Finance-Brücke: Job-completed erzeugt korrekte Rechnung ohne Doppelbuchung.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Mobile Monteur-Ansicht mit zeitlich begrenztem Token, nur eigene Dispatch-Daten.
- Kunden-Portal isoliert pro Kunde; keine Einblicke in fremde Adressen/Preise.
- Audit-Log für Angebots- und Abnahme-Änderungen (Nachweis für Gewährleistung).
- Drittanbieter (Telematik, Material-Shops) Keys in Core-Vault, nie im Code/Log.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `(tenantId, jobId)`, `(tenantId, customerId)`, `(tenantId, dispatchAt)`.
- Angebots-PDF-Generierung asynchron; Massen-Disposition als Background-Job.
- Kunden-Job-Historie gecached (TTL 10 min) pro `(customerId)`.
- p95 Ziel: Job-Liste < 120 ms, Angebots-Erstellung < 400 ms bei 50 Positionen.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
