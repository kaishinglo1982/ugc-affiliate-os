# CarryOS Universe – Band 56
# Masterprompt: Voice Agents (VOLLSTÄNDIG)

> Band: 56 | Masterprompt: 56.0 | Status: PLANNED | Gruppe: AI & Automation
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Planungs-Masterprompt. Implementierung erfolgt bandweise über Swarm/Codex, baut auf CarryOS Core + Band 11 Agent Runtime + Band 55 Speech AI auf; conversationaler Sprach-Assistent (kein Telefon-Netz, das ist Band 57).

## Kapitel 1 – Architektur

Voice Agents sind dialogfähige, sprachgesteuerte Assistenten je Tenant: Sie kombinieren ASR (Band 55), LLM-Orchestrierung (Band 11 Agent) und TTS (Band 55) zu einem bidirektionalen Sprach-Dialog mit Kontextgedächtnis und Tool-Aufrufen. Keine eigene Dialog-Engine – der Band 11 Agent führt den Turn-Loop; Speech I/O läuft über Band 55. Web-basiertes Audio (WebRTC/MediaStream) statt Telefonie.

- Dialog-Loop: ASR-Stream → Intent/Slot-Erkennung → Agent-Decision (Band 11) → Tool-Call → TTS-Antwort → Audio-Stream.
- Context-Memory: kurzfristiger Dialog-State + langfristiges Profil je Tenant/User, gespeichert in Prisma.
- Tool-Adapter: Voice-Agent ruft bestehende APIs (Band 41 CRM, Band 44 Angebot) via Agent-Tools, tenant-isoliert.
- Barge-In: Unterbrechung des Agents durch Nutzer mit VAD (Band 55) erlaubt.
- Free-First: ASR/TTS lokal (Band 55); LLM über Free-Tier, kommerziell nur nach Freigabe.

## Kapitel 2 – Datenmodelle

Voice-Agent-Daten streng tenant-isoliert; Audiostreams nie in DB, nur State + Transkripte.

- `VoiceAgent`: id, tenantId, name, persona, language, voiceId, tools[], isActive.
- `VoiceSession`: id, tenantId, agentId, userId, status, startedAt, endedAt, turnCount.
- `VoiceTurn`: id, tenantId, sessionId, role (user|agent), transcript, audioRef, intent, ts.
- `VoiceToolCall`: id, tenantId, sessionId, turnId, tool, args, resultRef, status.
- `VoiceProfile`: id, tenantId, userId, preferencesJson, contextJson, updatedAt.
- Unique-Index (tenantId, agentId, name); Soft-Delete via deletedAt.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod), Versionierung `/api/v1/voice/*`.

- `POST /api/v1/voice/agents` – Agent definieren (persona, voice, tools), idempotent.
- `POST /api/v1/voice/sessions` – Session starten, liefert WebSocket/WebRTC-Token (tenantKey).
- `POST /api/v1/voice/sessions/:id/turn` – User-Utterance (audio/text) → Agent-Turn + audioRef.
- `GET /api/v1/voice/sessions/:id/transcript` – vollständiger Dialog-Verlauf.
- `POST /api/v1/voice/sessions/:id/end` – Session beenden, State persistieren.
- `GET /api/v1/voice/agents/:id/tools` – konfigurierte Tool-Adapter des Agents.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue (Band 15), Namensschema `voice.*.v1`.

- `voice.agent.created.v1` – neuer Voice-Agent inkl. persona/tools, tenantId.
- `voice.session.started.v1` – Dialog-Session eröffnet, verlinkt user/profile.
- `voice.turn.completed.v1` – Turn (user+agent) abgeschlossen, enthält Intent + Tool-Calls.
- `voice.tool.executed.v1` – Agent-Tool aufgerufen (z. B. CRM-Lookup), Referenz auf Ergebnis.
- `voice.session.ended.v1` – Session beendet, State snapshotted. Keine Audiodaten in Events.

## Kapitel 5 – Workflows

Prozesse folgen Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope; idempotent via ExecutionKey.

- Turn-Workflow: Audio→ASR (Band 55) → Intent/Slot → Agent-Decision (Band 11) → ggf. Tool-Call → TTS (Band 55) → Persist Turn → Event.
- Session-Init-Workflow: Auth → Profil-Laden → Agent-Binden → WebSocket-Provisioning → `voice.session.started.v1`.
- Tool-Exec-Workflow: validierter Tool-Call → bestehende API (tenant-auth) → Ergebnis-Normalisierung → Context-Update.
- Handoff-Workflow: Eskalation an Menschen → Session-Pause + Übergabe-Kontext an Band 11 Task.

## Kapitel 6 – Agenten

Agenten/Rollen in der Band 11 Runtime registriert, keine eigene Dialog-Engine.

- `voice-orchestrator-agent`: führt den Turn-Loop, hält Dialog-State, entscheidet Tool-Calls.
- `intent-router-agent`: klassifiziert Intent + extrahiert Slots aus User-Utterance.
- `voice-persona-agent`: hält Ton/Tempo/Persona konsistent über Turns.
- `voice-fallback-agent`: bei Missverständnis → Clarification-Prompt oder Handoff.

## Kapitel 7 – UI

Voice-Oberfläche als Dashboard-Module, keine Fachlogik in Client-Komponenten.

- Voice-Agent-Builder: persona/voice/tools konfigurieren, Test-Dialog im Browser.
- Live-Console: laufende Session mit Transkript (user/agent) + Tool-Call-Log, Live-Audio.
- Session-History: vergangene Dialoge durchsuchbar, mit Intent-/Tool-Drilldown.
- Profile-Editor: VoiceProfile (Präferenzen/Kontext) je User pflegen.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation), Abdeckung Erfolgs-/Fehlerpfade.

- Unit: Intent-Routing, Slot-Extraktion, Barge-In-Logik, Tool-Args-Validierung (Zod).
- Integration: Audio→Turn→TTS Roundtrip; Tool-Call→CRM-Antwort→Antwort-Text.
- Security: Cross-Tenant-Session-Zugriff mit 403; tenantId-Filter in allen Repositories.
- Dialog-Tests: Mehr-Turn-Konversation mit Kontextgedächtnis + Handoff-Szenario.

## Kapitel 9 – Security

Authentifizierung über bestehendes System (keine zweite), Autorisierung via `requireApiPermission`, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- `requireApiPermission("voice:read" | "voice:write" | "voice:session")` je Endpunkt.
- WebSocket/WebRTC-Token tenant- und session-gebunden, kurzlebig, nicht wiederverwendbar.
- Tool-Calls laufen mit User-Kontext durch bestehende Autorisierung; kein Privilegien-Eskalations-Loch.
- DSGVO: Session-Transkripte löschbar je Tenant; Einwilligungs-Log für Sprachaufnahme.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Composite-Index (tenantId, sessionId, ts); Index auf VoiceAgent (tenantId, isActive).
- ASR/TTS asynchron via Band 55 + Band 11 Queue; Turn-Loop pipelined (overlap processing).
- Cache: Agent-Definition + Profil im Session-Speicher, Invalidierung bei Änderung.
- Ziel: First-Turn-Latenz p95 < 800 ms, Folge-Turn p95 < 600 ms, Audio-Stream-Jitter < 50 ms.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Tenant-Isolation-Test grün. 8. Multi-Turn-Dialog-Test mit Tool-Call grün.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
