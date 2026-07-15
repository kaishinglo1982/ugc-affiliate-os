# CarryOS Universe – Band 21
# Masterprompt: Coaching OS (VOLLSTÄNDIG)

> Band: 21 | Masterprompt: 21.0 | Status: PLANNED | Gruppe: Business Editions I
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Planungs-Masterprompt. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork. Coaching OS ist eine Edition auf CarryOS Core, distributioniert als Plugin/Preset.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Bestehende Systeme werden erweitert, nicht dupliziert. Keine zweite Runtime/Engine/Queue/Finance.

- Edition als Plugin-Preset auf CarryOS Core: Coaching-Module registrieren sich über das Band-16 Industry-Solution-Factory-Manifest, kein Fork des Cores.
- Domänenbereiche: Klientenmanagement, Coaching-Programme (Ziel- und Meilenstein-Tracking), Session-Planung, Journaling/Habit-Tracking, 360°-Feedback.
- Reusable-Komponenten aus Band 13/14 (Growth, Finance) werden als Package referenziert; Branchenlogik lebt in `src/editions/coaching/`.
- Sprach- und Video-Session-Integration über bestehende EventBus-/Queue-Infrastruktur, kein eigener Media-Server.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `Client` (Klient mit Zielprofil, Anamnese, Einwilligungen DSGVO), `CoachingProgram` (Zyklen, Pakete, Preise).
- `Session` (Termin, Typ Online/Präsenz, Status, Notizen-Verschlüsselung), `Milestone` und `HabitEntry` (Fortschrittsdaten).
- `Assessment` (Fragebogen-Definition + Ergebnis), `Goal` (SMART-Ziel mit Fälligkeitsdatum).
- Alle Tabellen zwingend `tenantId` + `workspaceId`; Audit-Felder (createdBy, createdAt) via Core-Mixin.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `POST /api/v1/coaching/clients` Klient anlegen inkl. Anamnese-Zod-Schema und DSGVO-Consent-Validierung.
- `POST /api/v1/coaching/programs/{id}/enroll` Klient in Programm einschreiben (idempotent via ExecutionKey).
- `GET /api/v1/coaching/clients/{id}/progress` aggregierter Fortschritt (Milestones + Habits + Assessments).
- `POST /api/v1/coaching/sessions/book` Session buchen mit Konfliktprüfung gegen Kalender.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `coaching.client.enrolled.v1` (Programmstart → Growth-OS Onboarding-Trigger).
- `coaching.session.completed.v1` (Notiz-Archivierung, Fakturierung via Finance OS).
- `coaching.milestone.reached.v1` (Fortschritts-Feedback an Klienten-Dashboard).
- `coaching.assessment.submitted.v1` (Ergebnis-Validierung, 360°-Report-Generierung).

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Onboarding: Anamnese → Zielsetzung → Programmzuweisung → erster Session-Vorschlag.
- Session-Lifecycle: Buchung → Erinnerung → Durchführung → Nachbereitung → Rechnungsstellung.
- Coaching-Zyklus: Assessment → Auswertung → Milestone-Review → Programm-Anpassung.
- Churn-Prävention: Inaktivitäts-Erkennung → Nudge-Workflow via Band 13 Growth.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `CoachingPlanner` Agent: automatische Session- und Milestone-Planung aus Zielprofil.
- `ProgressAnalyst` Agent: Auswertung von Habit-/Assessment-Daten, Generierung von Insights.
- `NudgeAgent`: proaktive Erinnerungen und Motivationstexte (Freier LLM-Tier, kein Premium).
- Rollen: Coach (Schreibrecht Klientendaten), Klient (eingeschränkter Lesepfad), Admin.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- Coach-Dashboard: Klientenliste, Programm-Fortschritt, Session-Kalender, Offene Tasks.
- Klienten-Portal: eigene Ziele, Habit-Tracker, Session-Historie, Assessments ausfüllen.
- Progress-Visualisierung: Meilenstein-Gantt, Habit-Streak-Charts (Core-Chart-Package).
- Alle Views rendern nur via Core-API-Envelope; keine direkten DB-Zugriffe im Client.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: Zod-Schemas für Anamnese/Assessment, Milestone-Berechnung, Preis-Paket-Logik.
- Integration: Enroll-Idempotenz, Session-Buchung mit Kalender-Konflikt, Event-Outbox.
- Security: Tenant-Isolation (Klient A sieht nicht Klient B), Rollen-Autorisierung Coach/Klient.
- DSGVO: Löschung eines Klienten entfernt Notizen und Habit-Daten vollständig über alle Tabellen.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Session-Notizen verschlüsselt (Field-Level-Encryption via Core-KMS-Integration), Schlüssel tenant-scoped.
- Klienten-Portal mit eigenem Token-Scope; keine Coach-Daten ohne explizite Freigabe.
- Audit-Log für alle Lese-/Schreibzugriffe auf sensiblen Anamnese- und Assessment-Daten.
- Einwilligungen (DSGVO Art. 6/9) als versionierte Consent-Einträge, widerrufbar.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `(tenantId, clientId)`, `(tenantId, sessionAt)`, `(tenantId, milestoneStatus)`.
- Session-Erinnerungen asynchron via Queue; Report-Generierung als Background-Job.
- Fortschritts-Aggregation gecached (TTL 5 min) pro `(clientId, programId)`.
- p95 Ziel: API-Lese < 150 ms, Buchungs-Write < 300 ms unter 10k Klienten/Tenant.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
