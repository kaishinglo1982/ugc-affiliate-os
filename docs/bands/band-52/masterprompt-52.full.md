# CarryOS Universe – Band 52
# Masterprompt: RAG System (VOLLSTÄNDIG)

> Band: 52 | Masterprompt: 52.0 | Status: PLANNED | Gruppe: AI & Automation
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Planungs-Masterprompt. Implementierung erfolgt bandweise über Swarm/Codex, baut auf CarryOS Core + Band 11 Agent Runtime + Band 51 Knowledge Engine auf.

## Kapitel 1 – Architektur

Das RAG System (Retrieval-Augmented Generation) verbindet dokumentenbasierte Vektor-Suche mit der Generation über die Band 11 Agent Runtime. Es nutzt bestehenden Postgres (pgvector) statt einer zweiten Vektor-Engine und bestehende Event/Outbox-Infrastruktur (Band 15). Keine eigene LLM-Orchestrierung – Prompts laufen in registrierten Band 11 Agents.

- Retrieval-Pipeline: Chunking → Embedding → Vektor-Index (pgvector) → Hybrid-Search (Vektor + BM25/fts) → Reranking → Context-Assembly.
- Generation-Layer: ruft einen Band 11 Agent mit zusammengebautem Context + System-Prompt; Streaming-Antworten über bestehendes Response-Envelope.
- Index-Sync: abonniert `knowledge.graph.updated.v1` (Band 51) und Dokument-Events (Band 53) zur automatischen Index-Aktualisierung.
- Context-Guard: verhindert Cross-Tenant-Retrieval durch hartes tenantId-Filter im Vektor-Query; kein globaler Index über Tenants.
- Free-First: Embedding + Generierung über Free-Tier/freies Modell; kommerzieller Provider nur nach Freigabe.

## Kapitel 2 – Datenmodelle

Alle RAG-Daten tenant-isoliert; pgvector-Spalte je Tenant in partitionierter Tabelle.

- `RagDocument`: id, tenantId, sourceRef, mimeType, lang, chunkCount, indexedAt, status.
- `RagChunk`: id, tenantId, documentId, seq, content, tokenCount, embedding (vector), metadata.
- `RagCollection`: id, tenantId, name, scope (kb|project|global), embeddingModel, createdAt.
- `RagQueryLog`: id, tenantId, query, retrievedChunkIds[], agentRunId, latencyMs, ratedUseful.
- `RagFeedback`: id, tenantId, queryLogId, rating (up|down), correction, createdBy.
- Unique-Index (tenantId, documentId, seq); pgvector-Index ivfflat mit tenantId-Partition.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod), Versionierung `/api/v1/rag/*`.

- `POST /api/v1/rag/collections` – Collection anlegen (Zod: name, scope, embeddingModel), idempotent.
- `POST /api/v1/rag/documents/ingest` – Dokument in Collection laden, triggert Chunking+Embedding-Job.
- `POST /api/v1/rag/query` – Retrieval+Generation, liefert Antwort + Quellen-Citations (Chunk-Refs).
- `GET /api/v1/rag/query/:id` – gespeicherte Query inkl. abgerufener Chunks und Agent-Run.
- `POST /api/v1/rag/feedback` – Nutzer-Feedback (Rating/Korrektur) für Query-Log.
- `GET /api/v1/rag/collections/:id/stats` – Chunk-Anzahl, Index-Gesundheit, Modell-Version.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue (Band 15), Namensschema `rag.*.v1`.

- `rag.document.indexed.v1` – Dokument fertig gechunkt+embedded, inkl. chunkCount, tenantId.
- `rag.collection.created.v1` – neue Collection mit Scope/Modell aktiviert.
- `rag.query.completed.v1` – Query beantwortet, Referenz auf abgerufene Chunks + Agent-Run.
- `rag.index.rebuild.requested.v1` – Reindex nach Modellwechsel oder Tenant-Import.
- Keine Chunk-Inhalte in Events; nur Referenzen + Metriken, tenantId Pflichtfeld.

## Kapitel 5 – Workflows

Prozesse folgen Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope; idempotent via ExecutionKey.

- Ingestion-Workflow: Upload → Validierung → Chunking (token-basiert, Overlap) → Embedding-Job (Band 11 Agent) → pgvector-Insert → `rag.document.indexed.v1`.
- Query-Workflow: Query-Embedding → Hybrid-Retrieval → Rerank (Score-Fusion) → Context-Cap (Token-Limit) → Agent-Generation → Citation-Map → Antwort.
- Reindex-Workflow: Modellwechsel → Bulk-Embedding neu → Partition-Swap → alter Index soft-delete.
- Feedback-Loop-Workflow: down-Rating → Review-Task (Band 11) → ggf. Chunk-Nachbearbeitung.

## Kapitel 6 – Agenten

Agenten/Rollen in der Band 11 Runtime registriert, keine eigene Orchestrierung.

- `rag-retriever-agent`: führt Hybrid-Search + Reranking aus, liefert gerankte Chunks.
- `rag-generator-agent`: baut Context aus Chunks, generiert Antwort mit Citations, wahrt Tenant-Grenze.
- `rag-chunker-agent`: semantisch sinnvolles Chunking (Satz-/Abschnittsgrenzen, Overlap).
- `rag-evaluator-agent`: prüft Antwort gegen abgerufene Quellen (Hallucination-Check, groundedness).

## Kapitel 7 – UI

RAG-Oberfläche als Dashboard-Module, keine Fachlogik in Client-Komponenten.

- RAG-Playground: Query-Eingabe, Streaming-Antwort, expandierbare Citations mit Chunk-Preview.
- Collection-Manager: Collections anlegen, Dokumente ingestieren, Index-Status anzeigen.
- Retrieval-Inspector: zeigt abgerufene Chunks + Rerank-Scores je Query zur Nachvollziehbarkeit.
- Feedback-Widget: up/down + Korrekturfeld, das `rag.feedback` speist.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation), Abdeckung Erfolgs-/Fehlerpfade.

- Unit: Chunking-Strategie (Overlap, Token-Cap), Rerank-Score-Fusion, Groundedness-Check.
- Integration: Hybrid-Search über pgvector + fts, Query→Agent→Citation-Roundtrip.
- Security: Query eines Tenants liefert niemals Chunks eines anderen Tenants (negative Tests).
- Evaluation: Offline-Benchmark (Recall@k, Faithfulness) auf Sample-Corpus je Tenant.

## Kapitel 9 – Security

Authentifizierung über bestehendes System (keine zweite), Autorisierung via `requireApiPermission`, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- `requireApiPermission("rag:read" | "rag:write" | "rag:query")` je Endpunkt.
- Vektor-Query enthält zwingend tenantId-Filter; Index ist tenant-partitioniert, Cross-Tenant unmöglich.
- Generierungs-Prompts dürfen nur Chunks desselben Tenants enthalten; Audit-Log für alle Queries.
- LLM-API-Keys im Band 15 Secrets-Store; keine Dokumentinhalte in Logs.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- ivfflat-Index auf embedding mit lists-Parameter je Datenvolumen; fts-GIN-Index auf Chunk-Content.
- Embedding-Batch-Jobs asynchron via Band 11 Queue; Chunk-Insert in COPY-Batches.
- Cache: häufige Queries (semantisch dedup) kurzzeitig gecached mit tenantKey.
- Ziel: Retrieval p95 < 120 ms, End-to-End-Query (inkl. Generation) p95 < 3 s, Ingestion 1k Chunks < 30 s.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Tenant-Isolation-Test grün. 8. Groundedness-Eval über Mindest-Recall@k.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
