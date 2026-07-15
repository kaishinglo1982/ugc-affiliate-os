# CarryOS Universe – Band 65
# Masterprompt: Knowledge Packs (VOLLSTÄNDIG)

> Band: 65 | Masterprompt: 65.0 | Status: PLANNED | Gruppe: Platform
> Abhängigkeit: Band 10–16 (Core), Band 51 (Knowledge Engine), Band 52 (RAG), keine Core-Fork

## Kapitel 1 – Architektur

- Knowledge Packs sind versionierte, kuratierte Wissens-Bundles (`knowledgePack`): Dokumente, Vektor-Indizes, Ontologien und Query-Templates, die in die Band-51/52 RAG-Pipeline geladen werden – keine eigene Knowledge-Engine.
- Pack deklariert Source-Corpus, Embedding-Modell-Pin (Version), Chunking-Strategie und Access-Scope pro Tenant.
- Retrieval erfolgt über bestehende RAG-Service; Pack liefert nur Index-Daten + Metadaten, keine eigene Vector-DB.
- Versionierung der Indizes: Rollback durch Re-Pin auf vorherige Pack-Version (immutable Snapshots).

## Kapitel 2 – Datenmodelle

- `KnowledgePack`: packId, version, name, authorId, corpusRef, embeddingModelPin, chunkStrategy, accessScope.
- `KnowledgePackInstallation`: tenantId, packId, version, indexSnapshotId, status, installedBy.
- `KnowledgeIndexSnapshot`: snapshotId, packId, vectorCount, checksum, createdAt (immutable).
- `KnowledgeQueryLog`: tenantId, packInstanceId, queryHash, retrievedDocs[], latencyMs.

## Kapitel 3 – APIs

- `GET /api/v1/knowledge-packs` – Katalog verfügbarer Packs (Public-lesbar).
- `POST /api/v1/knowledge-packs/:id/install` – Index-Snapshot im Tenant laden (Band-10-Envelope).
- `POST /api/v1/knowledge-packs/:id/query` – Retrieval über Band 52 mit tenantScope.
- `GET /api/v1/knowledge-packs/:id/snapshots` – Version-History pro Tenant.

## Kapitel 4 – Events

- `knowledge_pack.installed.v1`, `knowledge_pack.index_built.v1`, `knowledge_pack.queried.v1`, `knowledge_pack.rollback.v1`.
- Index-Build nutzt bestehende Outbox; Query-Events aggregieren in Band 52 Telemetrie.
- Alle Events mit `tenantId`, `packInstanceId`, `snapshotId`, `actorId`; versioniert.

## Kapitel 5 – Workflows

- Install-Flow: Corpus-Ingest → Embedding (gepinnte Modell-Version) → Snapshot-Erstellung → tenantScope-Bind → ExecutionKey → ACTIVE.
- Query-Flow: tenantContext → Snapshot-Select → RAG-Retrieval (Band 52) → rerank → Response → QueryLog.
- Rollback-Flow: Re-Pin auf vorigen Snapshot → alter Index deaktiviert, neuer aktiv, `knowledge_pack.rollback.v1`.

## Kapitel 6 – Agenten

- `KnowledgePackCuratorAgent` (Band 11): validiert Corpus, erkennt PII/DSGVO-relevante Inhalte, prüft Embedding-Pin.
- `RetrievalAgent`: führt tenant-isoliertes RAG-Query aus, filtered by accessScope.
- `IndexHealthAgent`: überwacht Snapshot-Integrität (Checksum), erkennt Vektor-Drift.

## Kapitel 7 – UI

- Knowledge-Pack-Katalog: Corpus-Beschreibung, Modell-Pin, Chunk-Info, Install.
- Retrieval-Explorer: Query-Test, retrieved-Docs-Vorschau, Relevance-Feedback pro Tenant.
- Snapshot-Manager: Version-Timeline, Rollback-Button, Index-Statistiken.

## Kapitel 8 – Tests

- Vitest-Unit: Embedding-Pin-Validation, Chunk-Strategie-Parse, Snapshot-Checksum, Query-Hash.
- Integration: Install→Query Roundtrip; Tenant A Index nicht in Tenant B abfragbar.
- Security-Test: Pack mit PII-Corpus ohne Markierung → Rejected durch CuratorAgent (DSGVO).

## Kapitel 9 – Security

- Corpus-Scan auf PII vor Index-Build (Band 74 DSGVO-Regeln); embeddingModelPin verhindert Drift.
- accessScope erzwingt tenantIsolation auf Vektor-Ebene; keine Cross-Tenant-Retrieval.
- requireApiPermission auf Install/Query; Audit aller Index-Builds und Rollbacks.

## Kapitel 10 – Performance

- Index-Build asynchron (Outbox), Query p95 < 200ms über gepinnte Embeddings + ANN-Indizes.
- Snapshot-Liste gecached (TTL 120s); Indizes auf (tenantId, packInstanceId, snapshotId).
- Vektor-Lookup nutzt bestehende RAG-Infra, kein Double-Indexing im Pack-Layer.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweite Knowledge-Engine.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
