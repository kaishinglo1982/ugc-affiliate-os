# CarryOS Universe – Band 26
# Masterprompt: Dachdecker Edition (VOLLSTÄNDIG)

> Band: 26 | Masterprompt: 26.0 | Status: PLANNED | Gruppe: Business Editions I
> Abhängigkeit: Band 10–16 (Core), Band 24 Handwerker Core, keine Core-Fork

> Hinweis: Planungs-Masterprompt. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork. Dachdecker Edition erweitert Handwerker Core (Band 24) als Konfiguration/Plugin.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Bestehende Systeme werden erweitert, nicht dupliziert. Keine zweite Runtime/Engine/Queue/Finance.

- Baut auf Band-24 Handwerker Core: Dach-spezifische Erweiterung via Plugin-Manifest, kein Fork.
- Domänenbereiche: Dachflächen-Erfassung, Bedachungsarten (Ziegel, Flachdach, Metalldach), Schadensaufnahme, Wartung/Reinigung, Dachgauben/Sanierung.
- Gewerk-Konfig: Material-Katalog (Dachziegel, Bitumen, PV-Unterkonstruktion), Neigung/Gefälle-Parameter.
- Wiederverwendung: Band 14 Finance, Band 11 Agents (Schadens-Klassifizierung), Band 13 Growth (Lead aus Sturm-Schaden).

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `RoofStructure` (Dachfläche, Neigung, Material, Alter, Fläche m²), `RoofDamage` (Befund je Fläche).
- `RoofJob` (Deckung, Sanierung, Reinigung, Dachrinne), `MaterialLine` (Ziegel/Bahn/Menge).
- `MaintenanceVisit` (Dachkontrolle/Reinigung-Intervall), `PhotoEvidence` (Schadens-Dokumentation).
- Erbt `Job`, `Quote`, `Customer` aus Band 24; alle Tabellen mit `tenantId` + `workspaceId`.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `POST /api/v1/roofer/roofs` Dachfläche mit Neigungs-/Material-Zod erfassen.
- `POST /api/v1/roofer/damages` Schadensaufnahme mit Foto-Referenz anlegen.
- `POST /api/v1/roofer/jobs/{id}/quote` Dach-Angebot mit Flächen-Kalkulation generieren.
- `GET /api/v1/roofer/roofs/{id}/condition` Zustandsbericht (Alter, Schäden, Wartung).

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `roofer.damage.reported.v1` (Schaden → Sofort-Angebot via Growth-Lead).
- `roofer.roof.inspected.v1` (Zustandsbericht → Wartungsplan-Setzen).
- `roofer.job.completed.v1` (Abnahme → Rechnung via Finance OS).
- `roofer.maintenance.due.v1` (Dachkontrolle fällig → Erinnerung).

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Schadens-Lifecycle: Meldung → Aufnahme (Foto) → Kalkulation → Angebot → Reparatur.
- Neudeckung: Bestandsaufnahme → Demontage → Deckung → Abschluss/Dichtigkeit → Abnahme.
- Wartung: Intervall-Trigger → Reinigung/Kontrolle → Befund → Folgetermin.
- Dachrinne/Entwässerung: Prüfung → Reinigung → Mangel-Behebung → Freigabe.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `DamageAgent`: klassifiziert Schadensbilder aus Fotos (freier Tier, keine Premium-Vision).
- `QuoteAgent`: berechnet Flächen-Material/Arbeit aus Neigung und Schadensumfang.
- `MaintenanceAgent`: plant Dachkontrollen saisonal (Herbst/Sturm-Nachlauf).
- Rollen: Dachdeckermeister, Monteur, Kunde (Bericht-Lesepfad), Versicherungs-Sachbearbeiter.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- Meister-Dashboard: offene Schäden, fällige Wartungen, Material-Bedarf, Auftrags-Liste.
- Monteur-View: Dach-Checkliste, Schadens-Foto, Flächen-Erfassung, mobiles Protokoll.
- Kunden-Portal: Zustandsbericht, Angebote, Wartungshistorie, Dokumentation.
- Dach-Bestand-Report (Flächen/Material) aus Core-Chart-Package.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: Flächen-Kalkulation, Neigungs-Validierung, Material-Bedarfs-Berechnung, Zod.
- Integration: Damage-Report-Idempotenz, Quote→Job-Brücke, Event-Outbox.
- Security: Tenant-Isolation (Dach A nicht sichtbar für Tenant B), Kunden-Scope.
- Versicherungs-Sicht: nur freigegebene Schadens-Dokumente, keine Kundendaten-Leak.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Schadens-Fotos als Beweisdokumente mit Audit-Log (Versicherungs-Nachweis).
- Kunden-Portal isoliert; Dachdaten nur für zuständigen Meister/Monteur.
- Versicherungs-Sachbearbeiter-Rolle mit eingeschränktem, freigegebenem Lesepfad.
- Keine Secrets (Wetter-API, Material-Shop) im Code/Log; in Core-Vault.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `(tenantId, roofId)`, `(tenantId, damageId)`, `(tenantId, dueAt)`.
- Zustandsbericht-PDF asynchron; Massen-Wartungs-Trigger als Background-Job.
- Dach-Bestand gecached (TTL 15 min) pro Kunde.
- p95 Ziel: Dach-Liste < 120 ms, Flächen-Angebot < 500 ms bei 20 Flächen.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
