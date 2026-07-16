# CarryOS Universe – Band 58
# Masterprompt: Meeting Agents (VOLLSTÄNDIG)

> Band: 58 | Masterprompt: 58.0 | Status: PLANNED | Gruppe: AI & Automation
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Planungs-Masterprompt. Implementierung erfolgt bandweise über Swarm/Codex, baut auf CarryOS Core + Band 11 Agent Runtime + Band 55 Speech AI + Band 53 Dokumentenanalyse auf; Meeting-Capture, Summary, Action-Items.

## Kapitel 1 – Architektur

Meeting Agents erfassen, transkribieren und analysieren Besprechungen je Tenant: Live-Join (Bot) oder Upload, Diarization (Band 55), Zusammenfassung, Aktionspunkte und Entscheidungen. Sie nutzen Band 11 Agent für Analyse und speisen Band 59 (Workflow Agents) mit Action-Items. Keine eigene Meeting-Engine – Konferenz-Anbindung über gekapselten Adapter (Free-Tier/selbstgehostet), Medien über Band 55.

- Capture-Adapter: Bot-Join (WebRTC/SIP) oder Upload; Audio→Band 55 ASR + Diarization.
- Analysis-Pipeline: Transcript → Summary-Agent → Action-Item-Agent → Decision-Agent → Entity-Link (Band 51).
- Artifact-Sync: Minutes als Dokument (Band 53) + Action-Items als Tasks (Band 59/11).
- Privacy: Aufzeichnung nur mit Opt-in; Redaktions-Modus für vertrauliche Segmente.
- Free-First: Transkription lokal (Band 55); Meeting-Provider-Free-Tier, kommerziell nach Freigabe.

## Kapitel 2 – Datenmodelle

Meeting-Daten streng tenant-isoliert; Medien nie in DB, nur Referenzen + Analyse-Artefakte.

- `Meeting`: id, tenantId, title, source (bot|upload), externalRef, startedAt, endedAt, status.
- `MeetingTranscript`: id, tenantId, meetingId, text, segmentsJson, lang, confidence.
- `MeetingSummary`: id, tenantId, meetingId, abstract, topicsJson, decisionsJson, generatedBy.
- `ActionItem`: id, tenantId, meetingId, title, assigneeId, dueDate, status, sourceSegmentRef.
- `MeetingParticipant`: id, tenantId, meetingId, name, role, attendeeRef, speakingSec.
- Unique-Index (tenantId, externalRef); Soft-Delete via deletedAt.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod), Versionierung `/api/v1/meetings/*`.

- `POST /api/v1/meetings` – Meeting anlegen (bot-join/upload), triggert Capture, idempotent.
- `GET /api/v1/meetings/:id/transcript` – Diarisiertes Transkript, tenant-gefiltert.
- `GET /api/v1/meetings/:id/summary` – Zusammenfassung + Decisions + Topics.
- `GET /api/v1/meetings/:id/action-items` – offene/erledigte Aktionspunkte mit Assignee.
- `POST /api/v1/meetings/:id/action-items` – manuelles Action-Item ergänzen (Audit).
- `POST /api/v1/meetings/:id/redact` – vertrauliche Segmente schwärzen (DSGVO).

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue (Band 15), Namensschema `meeting.*.v1`.

- `meeting.captured.v1` – Meeting aufgezeichnet/transkribiert, inkl. dauer, tenantId.
- `meeting.summarized.v1` – Zusammenfassung + Decisions erzeugt, verlinkt summary.
- `meeting.actionitems.created.v1` – Aktionspunkte extrahiert, triggern Band 59 Task-Erstellung.
- `meeting.minutes.published.v1` – Protokoll als Dokument (Band 53) veröffentlicht.
- Keine Gesprächsinhalte in Events; nur Referenzen + Metadaten, tenantId Pflichtfeld.

## Kapitel 5 – Workflows

Prozesse folgen Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope; idempotent via ExecutionKey.

- Capture-Workflow: Join/Upload → Band 55 ASR+Diarization → Transcript-Persistenz → `meeting.captured.v1`.
- Analysis-Workflow: Transcript → Summary → Action-Items → Decisions → Entity-Link (Band 51) → `meeting.summarized.v1`.
- Action-Workflow: Action-Items → Task-Erstellung (Band 59/11) mit Assignee/Due → `meeting.actionitems.created.v1`.
- Redaction-Workflow: Schwärzung → Segment-Update → Re-Derivation von Summary mit Opt-out.

## Kapitel 6 – Agenten

Agenten/Rollen in der Band 11 Runtime registriert, keine eigene Meeting-Engine.

- `meeting-capture-agent`: steuert Bot-Join/Upload und Medien-Routing an Band 55.
- `summary-agent`: verdichtet Transcript zu Themen/Entscheidungen je Tenant-Kontext.
- `action-item-agent`: extrahiert Aufgaben mit Zod-Schema (title, assignee, due) aus Transcript.
- `meeting-qa-agent`: prüft Summary-Coverage (alle Topics erfasst) und meldet Lücken.

## Kapitel 7 – UI

Meeting-Oberfläche als Dashboard-Module, keine Fachlogik in Client-Komponenten.

- Meeting-Inbox: geplante/erfasste Meetings, Bot-Einladungs-Hilfe, Upload-Drop.
- Transcript-Player: synchrones Transkript mit Sprecher-Labels + Redactions.
- Summary-View: Themen/Entscheidungen/Aktionspunkte, editierbar, mit Assignee-Dropdown.
- Action-Board: Aktionspunkte als Kanban, verlinkt zu Band 59 Tasks.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation), Abdeckung Erfolgs-/Fehlerpfade.

- Unit: Summary-Extraktion, Action-Item-Parsing (Zod), Decision-Detection, Redaction-Mask.
- Integration: Upload→Transcript→Summary→Action-Item→Band 59 Task Roundtrip.
- Security: Cross-Tenant-Meeting-Zugriff mit 403; tenantId-Filter in allen Repositories.
- Privacy-Tests: Redaction entfernt Segment aus Summary + Transcript-Persistenz.

## Kapitel 9 – Security

Authentifizierung über bestehendes System (keine zweite), Autorisierung via `requireApiPermission`, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- `requireApiPermission("meetings:read" | "meetings:write" | "meetings:redact")` je Endpunkt.
- Medien in tenant-gekapseltem Store mit signed URLs; Bot-Credentials im Band 15 Secrets-Store.
- DSGVO: Opt-in-Log pro Aufzeichnung; Redaction + Löschung kaskadiert je Tenant.
- Keine Transkript-Inhalte in Logs/Events; nur Referenzen + Metadaten.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Composite-Index (tenantId, startedAt, status); Index auf ActionItem (tenantId, status, assigneeId).
- Capture/Analysis asynchron via Band 11 Queue; Langmeetings in Zeitfenster-Batches.
- Cache: Summary + Action-Items kurzzeitig je Meeting, Invalidierung bei Edit.
- Ziel: Transkription (Band 55) p95 < 90 s/Stunde, Summary p95 < 15 s, Action-Query p95 < 40 ms.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Tenant-Isolation-Test grün. 8. Action-Item→Band 59 Task Roundtrip grün.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
