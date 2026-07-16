# CarryOS Universe – Band 57
# Masterprompt: Telefon-Agenten (VOLLSTÄNDIG)

> Band: 57 | Masterprompt: 57.0 | Status: PLANNED | Gruppe: AI & Automation
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Planungs-Masterprompt. Implementierung erfolgt bandweise über Swarm/Codex, baut auf CarryOS Core + Band 11 Agent Runtime + Band 55 Speech AI + Band 56 Voice Agents auf; Telefon-Netz-Anbindung (SIP/Telephony) statt Web-Voice.

## Kapitel 1 – Architektur

Telefon-Agenten führen automatisierte Telefonie-Dialoge je Tenant über SIP/Telefon-Gateways: Anruf-Annahme, IVR-Ersetzung, Outbound-Campaigns, Warm-Transfer zu Menschen. Sie kapseln ein bestehendes Telefonie-Gateway (FreeSWITCH/Asterisk oder Free-Tier-Provider) und nutzen Band 55 (ASR/TTS) + Band 56 (Dialog-Loop). Keine zweite Telefonie-Engine; Gateway ist Adapter hinter Band 11 Agent.

- Telephony-Adapter: SIP-Registrierung, Call-Leg-Management, DTMF, Recording-Flag (DSGVO-opt-in).
- Call-Flow: Inbound-Routing → Agent-Begrüßung → Dialog-Loop (Band 56) → Disposition → Hangup/Transfer.
- Outbound-Campaign: Rate-Limited Wählplan je Tenant, Do-Not-Call-Liste erzwungen, Zeitfenster-Regeln.
- Warm-Transfer: Kontext-Snapshot an menschlichen Agenten (Band 11 Task), keine Tonnen-Übergabe ohne Context.
- Free-First: selbstgehostetes FreeSWITCH (kostenlos); kommerzieller Telefonie-Provider nur nach Freigabe.

## Kapitel 2 – Datenmodelle

Telefonie-Daten streng tenant-isoliert; Recording nie in DB, nur Referenz + Metadaten.

- `PhoneAgent`: id, tenantId, name, didNumber, persona, voiceId, flowId, isActive.
- `CallSession`: id, tenantId, agentId, direction (in|out), fromNumber, toNumber, status, startedAt, endedAt.
- `CallDisposition`: id, tenantId, sessionId, outcome, notes, followUpRef, createdBy.
- `PhoneFlow`: id, tenantId, name, stepsJson, transferTarget, businessHours.
- `DncEntry`: id, tenantId, phoneNumber, reason, expiresAt, source.
- Unique-Index (tenantId, didNumber); Soft-Delete via deletedAt.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod), Versionierung `/api/v1/phone/*`.

- `POST /api/v1/phone/agents` – Telefon-Agent (DID, persona, flow) anlegen, idempotent.
- `POST /api/v1/phone/campaigns` – Outbound-Campaign mit Rate-Limit + DNC-Filter definieren.
- `POST /api/v1/phone/flows` – Call-Flow (Steps, Transfer-Target) versioniert speichern.
- `GET /api/v1/phone/sessions/:id` – Call-Verlauf + Disposition + transcriptRef, tenant-gefiltert.
- `POST /api/v1/phone/dnc` – Nummer auf Do-Not-Call setzen (DSGVO/Regulatorik).
- `POST /api/v1/phone/sessions/:id/transfer` – Warm-Transfer mit Kontext-Snapshot triggern.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue (Band 15), Namensschema `phone.*.v1`.

- `phone.agent.registered.v1` – Agent mit DID aktiv, tenantId, flowRef.
- `phone.call.started.v1` – Anruf (in/out) angenommen, verlinkt session, keine Audio-Daten.
- `phone.call.dispositioned.v1` – Ergebnis/Abschluss erfasst, followUp-Ref.
- `phone.call.transferred.v1` – Warm-Transfer an Menschen mit Kontext-Snapshot.
- `phone.dnc.added.v1` – Nummer gesperrt. Keine Gesprächsinhalte in Events, tenantId Pflichtfeld.

## Kapitel 5 – Workflows

Prozesse folgen Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope; idempotent via ExecutionKey.

- Inbound-Workflow: SIP-Event → Agent-Routing → Begrüßung (TTS) → Dialog-Loop (Band 56) → Disposition → `phone.call.dispositioned.v1`.
- Outbound-Workflow: Campaign-Pick → DNC-Check → Rate-Limit → Wählen → Dialog → Disposition.
- Transfer-Workflow: Escalation → Context-Snapshot → Human-Task (Band 11) → `phone.call.transferred.v1`.
- Compliance-Workflow: DNC/Zeitfenster-Prüfung vor jedem Wählversuch; Verstoß → Block + Audit.

## Kapitel 6 – Agenten

Agenten/Rollen in der Band 11 Runtime registriert, keine eigene Telefonie-Engine.

- `telephony-orchestrator-agent`: steuert Call-Leg + Dialog-Loop, hält Call-State.
- `ivr-replacement-agent`: beantwortet Routinen (Öffnungszeiten, Termin, Weiterleitung).
- `outbound-campaign-agent`: führt Wählplan mit DNC/Rate-Limit und Folge-Disposition aus.
- `call-transfer-agent`: bereitet Warm-Transfer-Kontext für menschliche Agenten auf.

## Kapitel 7 – UI

Telefon-Oberfläche als Dashboard-Module, keine Fachlogik in Client-Komponenten.

- Phone-Agent-Console: DID/Persona/Flow konfigurieren, Live-Call-Monitor mit Transkript.
- Campaign-Manager: Outbound-Listen, Rate-Limit, DNC-Import, Ergebnis-Report.
- Flow-Builder: visueller Call-Flow-Editor (Steps, Transfer, Business-Hours).
- Disposition-Dashboard: Call-Ergebnisse je Agent/Tenant, mit Follow-Up-Verknüpfung.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation), Abdeckung Erfolgs-/Fehlerpfade.

- Unit: DNC-Match, Rate-Limiter, Flow-Step-Auswertung, Disposition-Validierung (Zod).
- Integration: SIP-Adapter-Mock→Call→Dialog→Disposition; Event→Band 56 Session-Link.
- Security: Cross-Tenant-Call-Zugriff mit 403; tenantId-Filter in allen Repositories.
- Compliance-Tests: DNC blockiert Anruf; Zeitfenster außerhalb → kein Wählversuch.

## Kapitel 9 – Security

Authentifizierung über bestehendes System (keine zweite), Autorisierung via `requireApiPermission`, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- `requireApiPermission("phone:read" | "phone:write" | "phone:campaign")` je Endpunkt.
- SIP-Credentials/API-Keys im Band 15 Secrets-Store; Recordings in tenant-gekapseltem Store.
- DSGVO: Einwilligung/Opt-in-Log pro Recording; DNC zwingend vor Wählversuch.
- Keine Gesprächsinhalte in Logs/Events; nur Referenzen + Disposition-Metadaten.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Composite-Index (tenantId, didNumber, status); Index auf DncEntry (tenantId, phoneNumber).
- Call-Handling asynchron via Band 11 Queue; Gateway-Events entkoppelt über Outbox.
- Cache: PhoneFlow + Agent-Definition im Call-State, Invalidierung bei Änderung.
- Ziel: Call-Setup-Latenz p95 < 1 s, Dialog-Turn (Band 56) p95 < 700 ms, DNC-Lookup p95 < 5 ms.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Tenant-Isolation-Test grün. 8. DNC/Compliance-Test grün (kein Anruf trotz Liste).

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
