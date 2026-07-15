# CarryOS Universe – Band 51
# Masterprompt: Knowledge Engine (VOLLSTÄNDIG)

> Band: 51 | Masterprompt: 51.0 | Status: PLANNED | Gruppe: AI & Automation
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Planungs-Masterprompt. Implementierung erfolgt bandweise über Swarm/Codex, baut auf CarryOS Core + Band 11 Agent Runtime auf, keine zweite Engine.

## Kapitel 1 – Architektur

Die Knowledge Engine ist die zentrale Wissensverwaltung des CarryOS Universe: Ontologie, Taxonomie, Entity-Resolution und verknüpftes Wissen je Tenant. Sie nutzt die Band 11 Agent Runtime für Extraktion/Anreicherung und das Band 15 Event-System für Propagation. Keine eigene Graph-Datenbank-Engine – bestehende Postgres/Prisma-Speicherung mit Graph-Erweiterung (pg_trgm/edge-Tabelle) wird genutzt.

- Ontologie-Modell: Concepts, Relations, Aliases als versionierte Entitäten mit tenantId; Schema-Versionierung pro Tenant erlaubt branchenspezifische Vokabulare (z. B. SHK-Begriffe aus Band 17).
- Entity-Resolution-Service: dedupiziert Entitäten über Fuzzy-Matching (ngram + embedding-Ähnlichkeit), löst Merge-Konflikte über erkannte Confidence-Scores und hinterlegt Audit-Trail.
- Knowledge-Graph-Store: gerichteter Graph in Prisma (node + edge Tabellen) mit tenantId-Filter; Traversierung über rekursive CTEs, keine externe Graph-Engine.
- Sync-Adapter: abonniert Events aus Band 12 (Content), Band 14 (Finance) und Band 41 (CRM), um Wissen automatisch aus Fachdaten zu speisen.
- Free-First: Embeddings über lokales/freies Modell (z. B. sentence-transformers via Ollama) statt kommerzieller API, es sei denn Free-Tier reicht nicht und Freigabe liegt vor.

## Kapitel 2 – Datenmodelle

Wissensdaten sind streng tenant-isoliert; jede Tabelle trägt tenantId und wird über Repository-Layer mit Mandantenfilter abgefragt.

- `KnowledgeConcept`: id, tenantId, label, type, sourceRefs[], confidence, version, createdBy, updatedAt.
- `KnowledgeRelation`: id, tenantId, fromConceptId, toConceptId, predicate, weight, provenance, version.
- `KnowledgeAlias`: id, tenantId, conceptId, alias, locale, matchStrategy (exact|fuzzy|embedding).
- `OntologySchema`: id, tenantId, name, version, definition (JSON-Schema), isActive.
- `EntityResolutionJob`: id, tenantId, status, inputRef, matchedConceptId, score, resolvedBy (agent|user), auditLog.
- Alle Modelle mit Unique-Index (tenantId, businessKey) und Soft-Delete via deletedAt.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod), Versionierung im Pfad `/api/v1/knowledge/*`.

- `POST /api/v1/knowledge/concepts` – Concept anlegen/aktualisieren (Zod-Schema für label/type/sourceRefs), idempotent via ExecutionKey.
- `GET /api/v1/knowledge/concepts/:id` – Concept inkl. verknüpfter Relations, tenant-gefiltert.
- `POST /api/v1/knowledge/resolve` – Entity-Resolution-Trigger für eine Quellreferenz, gibt Matches mit Scores zurück.
- `GET /api/v1/knowledge/graph/traverse` – Graph-Traversierung ab Concept mit maxDepth, liefert Pfade.
- `POST /api/v1/knowledge/ontologies` – Ontologie-Schema versioniert hochladen/aktivieren.
- `GET /api/v1/knowledge/search` – semantische Suche über Aliases + Embedding-Ähnlichkeit, paginiert.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue (Band 15), Namensschema `knowledge.*.v1`.

- `knowledge.concept.created.v1` – neuer Concept-Knoten inkl. tenantId, label, type.
- `knowledge.relation.merged.v1` – Entity-Resolution hat zwei Concepts zusammengeführt, enthält Mapping.
- `knowledge.ontology.activated.v1` – neues aktives Schema versioniert veröffentlicht.
- `knowledge.graph.updated.v1` – Bulk-Update nach Sync-Adapter-Lauf, triggert RAG-Index-Refresh (Band 52).
- Events niemals mit Rohinhalten externer Dienste; nur Referenzen + Metadaten, tenantId Pflichtfeld.

## Kapitel 5 – Workflows

Prozesse folgen Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope; idempotent via ExecutionKey.

- Ingestion-Workflow: externes Event → Concept-Extraktion (Band 11 Agent) → Entity-Resolution → Persistenz → `knowledge.graph.updated.v1`.
- Resolution-Review-Workflow: niedrig-Confidence-Match → Mensch-im-Loop-Task (Band 11) → Bestätigung/Ablehnung → Audit.
- Ontology-Activation-Workflow: Schema-Upload → Validierung gegen JSON-Schema → Version-Bump → Aktivierung → Reindex.
- Bulk-Reindex-Workflow: nach Tenant-Import → Graph-Validierung → Embedding-Neuberechnung → Cache-Invalidierung.

## Kapitel 6 – Agenten

Agenten/Rollen sind in der Band 11 Runtime registriert, keine eigene Agent-Engine.

- `knowledge-extractor-agent`: liest Fachdaten-Events, extrahiert Concepts/Relations, schreibt mit Confidence.
- `entity-resolver-agent`: führt Entity-Resolution aus, entscheidet Merge bei Schwellwert-Überschreitung.
- `ontology-curator-agent`: schlägt Aliases/Taxonomie-Erweiterungen vor, wartet auf menschliche Freigabe.
- `graph-maintenance-agent`: erkennt verwaiste Knoten/Orphan-Relations und meldet zur Bereinigung.

## Kapitel 7 – UI

Wissens-Oberfläche als Dashboard-Module, keine Fachlogik in Client-Komponenten (Aufruf via API).

- Knowledge-Graph-Explorer: interaktive Visualisierung (D3/Visx) mit Drill-Down je Concept, tenant-gebunden.
- Ontology-Editor: Versionierung, Alias-Pflege, Schema-Diff zwischen Versionen.
- Resolution-Review-Queue: Liste offener niedrig-Confidence-Matches mit Accept/Reject.
- Search-Bar mit semantischen Vorschlägen, die Aliases + Embedding-Treffer nutzt.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation), Abdeckung Erfolgs-/Fehlerpfade.

- Unit: Entity-Resolution-Score-Berechnung, Alias-Matching-Strategien, Ontologie-Validierung.
- Integration: Graph-Traversierung über rekursive CTE, Event→Concept-Persistenz via Outbox.
- Security: Cross-Tenant-Zugriff auf Concept/Relation wird mit 403 abgelehnt; tenantId-Filter in allen Repositories getestet.
- Performance-Test: Traversierung bei 100k Knoten je Tenant unter p95-Ziel.

## Kapitel 9 – Security

Authentifizierung über bestehendes System (keine zweite), Autorisierung via `requireApiPermission`, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- `requireApiPermission("knowledge:read" | "knowledge:write" | "knowledge:admin")` je Endpunkt.
- Embedding-Provider-Keys in Band 15 Secrets-Store, nie im Code; Audit-Log für alle Resolution-Merges.
- DSGVO: Löschantrag löscht Concepts/Aliases eines Tenant vollständig inkl. Relationen-Kaskade.
- Keine Speicherung von Quelldokument-Inhalten in Events; nur Referenzen und Metadaten.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Composite-Index (tenantId, label, type) und GIN-Index auf Alias für schnelle Fuzzy-Suche.
- Embedding-Berechnung asynchron via Band 11 Agent-Queue; Graph-Reindex batched in Chunks à 1.000 Knoten.
- Cache: Materialized-View der Top-Level-Concepts je Tenant, Invalidierung über `knowledge.graph.updated.v1`.
- Ziel: Concept-Lookup p95 < 50 ms, Traversierung p95 < 300 ms, Embedding-Job-Latenz < 2 s.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Tenant-Isolation-Test grün (Cross-Tenant-Reject). 8. Graph-Traversierung-Performance unter p95-Ziel.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
