# CarryOS Universe – Band 55
# Masterprompt: Speech AI (VOLLSTÄNDIG)

> Band: 55 | Masterprompt: 55.0 | Status: PLANNED | Gruppe: AI & Automation
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Planungs-Masterprompt. Implementierung erfolgt bandweise über Swarm/Codex, baut auf CarryOS Core + Band 11 Agent Runtime auf; versorgt Band 56/57/58 mit Transkription & Sprachverständnis.

## Kapitel 1 – Architektur

Speech AI ist die auditive Wahrnehmungs- und Erzeugungsschicht: Speech-to-Text (ASR), Text-to-Speech (TTS), Speaker-Diarization, Spracherkennung und Audio-Normalisierung je Tenant. Sie nutzt gekapselte freie Modelle (whisper.cpp, Piper/Coqui) statt einer zweiten Audio-Engine; Band 11 Agent Runtime orchestriert Pipelines. Keine eigene Echtzeit-Telefonie (das ist Band 57).

- ASR-Pipeline: Audio-Decode → VAD (Voice Activity Detection) → Segmentierung → whisper-Transkription → Wort-Timestamps.
- TTS-Pipeline: Text-Normalisierung → Phonemisierung → neurales Vocoder (Piper) → Audio-Encode (opus/mp3).
- Diarization: Clustering der Speaker-Embeddings, Zuordnung von Segmenten zu Sprechern.
- Lang-Detection: bestimmt Sprache je Segment für mehrsprachige Transkription.
- Free-First: whisper/piper lokal; kommerzielles Speech-API nur bei Freigabe + Free-Tier unzureichend.

## Kapitel 2 – Datenmodelle

Speech-Daten streng tenant-isoliert; Audiodateien nie in DB, nur Referenzen + Transkripte.

- `SpeechAsset`: id, tenantId, sourceRef, mimeType, durationSec, channels, sampleRate, lang, status.
- `Transcript`: id, tenantId, assetId, engine, modelVersion, text, confidence, segmentsJson.
- `TranscriptSegment`: id, tenantId, transcriptId, startMs, endMs, speaker, text, confidence.
- `TtsJob`: id, tenantId, status, textRef, voice, speed, outputRef, progress, error.
- `SpeechJob`: id, tenantId, status, assetRef, tasks[], progress, startedBy.
- Unique-Index (tenantId, sourceRef); Soft-Delete via deletedAt.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod), Versionierung `/api/v1/speech/*`.

- `POST /api/v1/speech/transcribe` – Asset referenzieren + ASR/Diarization triggern, idempotent.
- `GET /api/v1/speech/assets/:id/transcript` – Volltext + Segmente + Speaker, tenant-gefiltert.
- `POST /api/v1/speech/tts` – Text→Audio (voice, speed), liefert outputRef/signed URL.
- `GET /api/v1/speech/assets/:id/diarize` – Sprecher-Zuordnung je Segment.
- `POST /api/v1/speech/assets/:id/correct` – manuelle Transkript-Korrektur (Audit).
- `GET /api/v1/speech/search` – Suche in Transkripten über tenant-isolierten Index.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue (Band 15), Namensschema `speech.*.v1`.

- `speech.asset.stored.v1` – Audio gespeichert, inkl. dauer, mimeType, tenantId.
- `speech.transcribed.v1` – ASR fertig, verlinkt Band 58 Meeting/Transcript-Consumer.
- `speech.diarized.v1` – Sprecher-Zuordnung fertig, Segmente mit speaker-Label.
- `speech.tts.completed.v1` – Sprachausgabe generiert, outputRef + Metadaten.
- Keine Audiodaten in Events; nur Referenzen + Metadaten, tenantId Pflichtfeld.

## Kapitel 5 – Workflows

Prozesse folgen Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope; idempotent via ExecutionKey.

- Transcribe-Workflow: Asset-Store → VAD → Segmentierung → whisper → Segment-Persistenz → `speech.transcribed.v1`.
- Diarize-Workflow: Embeddings → Clustering → Speaker-Labels → Segment-Update → Event.
- TTS-Workflow: Text-Normalisierung → Vocoder → Encode → Store → `speech.tts.completed.v1`.
- Correction-Workflow: manuelle Korrektur → Audit + Reindex des Transkripts.

## Kapitel 6 – Agenten

Agenten/Rollen in der Band 11 Runtime registriert, keine eigene Audio-Engine.

- `asr-agent`: führt Transkription mit whisper aus, liefert Segmente + Confidence.
- `diarization-agent`: clustert Sprecher und labelt Segmente.
- `tts-agent`: synthetisiert Sprache via Piper/Coqui mit Stimmen-Auswahl.
- `speech-qa-agent`: prüft Transkript-Qualität (Stille/Überlappung) und meldet Nachbearbeitung.

## Kapitel 7 – UI

Speech-Oberfläche als Dashboard-Module, keine Fachlogik in Client-Komponenten.

- Speech-Uploader: Audio hochladen, Task-Auswahl (Transcribe/Diarize/TTS), Fortschritt.
- Transcript-Player: Audio-Sync mit Wort-Timestamps, editierbarer Text je Segment.
- Speaker-Label-Editor: Sprecher umbenennen/zuordnen in Diarization-Ansicht.
- TTS-Studio: Text eingeben, Stimme/Tempo wählen, Audio-Vorschau abspielen.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation), Abdeckung Erfolgs-/Fehlerpfade.

- Unit: VAD-Segmentierung, Wort-Timestamp-Alignment, TTS-Text-Normalisierung, Diarization-Clustering.
- Integration: Asset→Transcript→Band 58 Consumer Roundtrip; Event→Transcript-Record.
- Security: Cross-Tenant-Asset-Zugriff mit 403; tenantId-Filter in allen Repositories.
- Format-Tests: mp3/wav/m4a/opus mit Rauschen → robuste Transkription.

## Kapitel 9 – Security

Authentifizierung über bestehendes System (keine zweite), Autorisierung via `requireApiPermission`, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- `requireApiPermission("speech:read" | "speech:write" | "speech:correct")` je Endpunkt.
- Audiodateien in tenant-gekapseltem Object-Store mit signed URLs, nie öffentlich.
- Speech-API-Keys im Band 15 Secrets-Store; keine Audiodaten in Logs/Events.
- DSGVO: Löschung löscht Asset + Transkript kaskadiert je Tenant; Einwilligungs-Log.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Composite-Index (tenantId, status); Index auf TranscriptSegment (tenantId, transcriptId).
- ASR/TTS asynchron via Band 11 Queue; Audio in Batches, GPU/CPU-Pool genutzt.
- Cache: wiedererkennung gleicher Asset-Hash (tenantKey) übersprungen.
- Ziel: Transkription 1h Audio p95 < 90 s (batch), TTS 1 Min Text p95 < 3 s, Segment-Query p95 < 50 ms.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Tenant-Isolation-Test grün. 8. ASR-Roundtrip für verrauschtes Audio grün.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
