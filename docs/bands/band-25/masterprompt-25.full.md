# CarryOS Universe – Band 25
# Masterprompt: Elektriker Edition (VOLLSTÄNDIG)

> Band: 25 | Masterprompt: 25.0 | Status: PLANNED | Gruppe: Business Editions I
> Abhängigkeit: Band 10–16 (Core), Band 24 Handwerker Core, keine Core-Fork

> Hinweis: Planungs-Masterprompt. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork. Elektriker Edition erweitert Handwerker Core (Band 24) als Konfiguration/Plugin.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Bestehende Systeme werden erweitert, nicht dupliziert. Keine zweite Runtime/Engine/Queue/Finance.

- Baut auf Band-24 Handwerker Core: Elektro-spezifische Erweiterung via Plugin-Manifest, kein Fork.
- Domänenbereiche: Anlagendokumentation (Elektroanlagen), Sicherheitsprüfung (VDE/DIN), Mängelbericht, Wartungsintervalle, E-Check.
- Gewerk-Konfig: Prüfprotokoll-Templates, Gefahrenpotenzial-Klassen, Norm-Referenzen (VDE 0100/0701/0702).
- Wiederverwendung: Band 14 Finance (Rechnung), Band 11 Agents (Prüfplan-Generierung).

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `ElectricalInstallation` (Anlage, Zähler, Hauptverteiler, Ort), `Circuit` (Stromkreis mit Absicherung).
- `SafetyInspection` (VDE-Prüfung, Typ, Ergebnis, Mängel), `DefectFinding` (Einzelbefund je Prüfpunkt).
- `MaintenanceSchedule` (Wartungsintervall E-Check), `TestProtocol` (Messwerte, RCD-Zeit, Isolationswiderstand).
- Erbt `Job`, `Quote`, `Customer` aus Band 24; alle Tabellen mit `tenantId` + `workspaceId`.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `POST /api/v1/electrician/inspections` VDE-Prüfung mit Messwert-Zod anlegen.
- `POST /api/v1/electrician/installations/{id}/circuits` Stromkreis erfassen (Absicherung validiert).
- `GET /api/v1/electrician/installations/{id}/protocol` Prüfprotokoll-PDF (VDE 0701/0702).
- `POST /api/v1/electrician/defects/{id}/remediate` Mangel-Nachbesserung dokumentieren.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `electrician.inspection.passed.v1` (VDE-Bestanden → Wartungsplan-Setzen).
- `electrician.inspection.failed.v1` (Mangel → Nachbesser-Auftrag via Band 24 Job).
- `electrician.defect.found.v1` (Gefahrenpotenzial → Kunde-Eskalation/Growth-Alert).
- `electrician.maintenance.due.v1` (E-Check fällig → Erinnerung via Finance/Reminder).

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- VDE-Prüfung: Auftrag → Messung → Protokoll → Bewertung → Freigabe/Befund.
- Neuinstallation: Planung → Ausführung → Abnahmemessung → Dokumentation → Übergabe.
- Wartung: Intervall-Trigger → E-Check-Einsatz → Protokoll → Folgetermin.
- Mängel: Befund → Klassifizierung (Gefahr) → Nachbesser-Termin → Freigabe.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `InspectionAgent`: generiert VDE-Prüfplan aus Anlagen-Typ und Norm-Anforderungen.
- `ProtocolAgent`: füllt Prüfprotokoll-Vorlage aus Messwerten (freier Tier).
- `MaintenanceAgent`: plant E-Check-Termine vor Ablauf des Intervalls.
- Rollen: Elektromeister, Monteur, Kunde (Protokoll-Lesepfad), Prüfingenieur.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- Meister-Dashboard: offene Prüfungen, fällige Wartungen, Mängel-Liste, Anlagen-Bestand.
- Monteur-View: Prüf-Checkliste, Messwerte-Eingabe, Foto-Befund, mobiles Protokoll.
- Kunden-Portal: Anlagendokumentation, Prüfprotokolle, Wartungshistorie.
- Compliance-Report (VDE-Bestand) aus Core-Chart-Package.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: VDE-Bewertungslogik, Messwert-Validierung, Wartungs-Intervall-Berechnung, Zod.
- Integration: Inspection-Idempotenz, Defect→Job-Brücke, Protocol-Event-Outbox.
- Security: Tenant-Isolation (Anlage A nicht sichtbar für Tenant B), Kunden-Scope.
- Norm-Konformität: Testdaten decken VDE 0100/0701/0702 Pfade ab.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Prüfprotokolle als vertragsrelevante Dokumente mit Audit-Log (Nachweis Haftung).
- Kunden-Portal isoliert; Anlagendaten nur für zuständigen Meister/Monteur.
- Gefahren-Mängel verschlüsselt markiert; Eskalation nur an autorisierte Rollen.
- Keine Secrets (Messgeräte-APIs) im Code/Log; in Core-Vault.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `(tenantId, installationId)`, `(tenantId, inspectionId)`, `(tenantId, dueAt)`.
- Protokoll-PDF asynchron via Queue; Massen-Wartungs-Trigger als Background-Job.
- Anlagen-Bestand gecached (TTL 15 min) pro Kunde.
- p95 Ziel: Prüflisten-Laden < 100 ms, Protokoll-Generierung < 1,5 s.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
