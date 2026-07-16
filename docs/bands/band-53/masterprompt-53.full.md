# CarryOS Universe – Band 53
# Masterprompt: Dokumentenanalyse (VOLLSTÄNDIG)

> Band: 53 | Masterprompt: 53.0 | Status: PLANNED | Gruppe: AI & Automation
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Planungs-Masterprompt. Implementierung erfolgt bandweise über Swarm/Codex, baut auf CarryOS Core + Band 11 Agent Runtime + Band 52 RAG auf.

## Kapitel 1 – Architektur

Die Dokumentenanalyse strukturiert unstrukturierte Dokumente (PDF, DOCX, XLSX, E-Mail, Bilder mit Text) in normalisierte, maschinenlesbare Records je Tenant. Sie nutzt die Band 11 Agent Runtime für Klassifikation/Extraktion und speist Band 52 (RAG) sowie Band 51 (Knowledge). Keine eigene Parsing-Engine – bestehende Bibliotheken (pdf-parse, mammoth, sharp) werden gekapselt in Services genutzt.

- Document-Ingestion-Pipeline: Detektierung → Format-Parser → Layout-Extraktion → Struktur-Mapping → Entity/Field-Extraktion.
- Classification-Service: bestimmt Dokumenttyp (Rechnung, Vertrag, Angebot, Mahnung) via Band 11 Agent + Regeln.
- Field-Extraction: extrahiert Ziel-Felder (Betrag, Datum, Adresse, Positionen) mit Zod-validierten Schemata je Typ.
- Storage-Bridge: Originale in Band 15 Object-Store (tenant-gekapselt), abgeleitete Records in Prisma, Index in Band 52.
- Free-First: lokale/freie Modelle für Klassifikation; kommerzielles OCR nur falls Free-Tier unzureichend + Freigabe.

## Kapitel 2 – Datenmodelle

Analysedaten streng tenant-isoliert; Originale nie in DB, nur Referenzen.

- `AnalyzedDocument`: id, tenantId, sourceRef, mimeType, docType, lang, pageCount, status, confidence.
- `DocumentField`: id, tenantId, documentId, name, value, unit, pageRef, bbox, confidence, extractionMethod.
- `DocumentEntity`: id, tenantId, documentId, kind (person|org|product|date|money), value, refConceptId (→Band 51).
- `DocumentClassification`: id, tenantId, documentId, docType, modelVersion, score, reviewedBy.
- `IngestionJob`: id, tenantId, status, sourceRef, progress, error, startedBy, finishedAt.
- Unique-Index (tenantId, sourceRef); Soft-Delete via deletedAt.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod), Versionierung `/api/v1/documents/*`.

- `POST /api/v1/documents/ingest` – Dokument hochladen/referenzieren, triggert Analyse-Job (idempotent via ExecutionKey).
- `GET /api/v1/documents/:id` – Metadaten + extrahierte Felder/Entities, tenant-gefiltert.
- `POST /api/v1/documents/:id/classify` – Klassifikation erzwingen/neu ausführen mit Typ-Vorgabe.
- `GET /api/v1/documents/:id/fields` – validierte Ziel-Felder nach Dokumenttyp-Schema.
- `POST /api/v1/documents/:id/review` – Menschliche Korrektur eines Felds/der Klassifikation (Audit).
- `GET /api/v1/documents/search` – Suche nach Feldwerten/Entities über tenant-isolierten Index.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue (Band 15), Namensschema `document.*.v1`.

- `document.ingested.v1` – Rohdokument gespeichert, inkl. mimeType, tenantId, sourceRef.
- `document.analyzed.v1` – Felder/Entities extrahiert, verlinkt Band 51 Concepts.
- `document.classified.v1` – Dokumenttyp final bestimmt (agent|reviewed).
- `document.indexed.v1` – Inhalt an Band 52 RAG zur Volltext-/Vektor-Indexierung übergeben.
- Keine Dokumentinhalte in Events; nur Referenzen + Metadaten, tenantId Pflichtfeld.

## Kapitel 5 – Workflows

Prozesse folgen Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope; idempotent via ExecutionKey.

- Ingestion-Workflow: Upload → Store (Band 15) → Parsing → Classification → Field-Extraction → Entity-Link (Band 51) → `document.analyzed.v1` → RAG-Index (Band 52).
- Review-Workflow: niedrig-Confidence-Feld → Mensch-im-Loop (Band 11) → Korrektur → Audit + Reindex.
- Batch-Import-Workflow: vieler Dokumente → parallele Jobs → Aggregations-Report je Tenant.
- Retention-Workflow: nach Aufbewahrungsfrist → Anonymisierung/Löschung gemäß DSGVO.

## Kapitel 6 – Agenten

Agenten/Rollen in der Band 11 Runtime registriert, keine eigene Engine.

- `doc-classifier-agent`: bestimmt Dokumenttyp aus Layout + Inhalt, liefert Score.
- `field-extractor-agent`: extrahiert typ-spezifische Felder mit Zod-Schema-Validierung.
- `entity-linker-agent`: verknüpft erkannte Entities mit Band 51 Knowledge Concepts.
- `doc-quality-agent`: erkennt schlechte Scans/fehlende Seiten und meldet zur Nachbearbeitung.

## Kapitel 7 – UI

Dokumenten-Oberfläche als Dashboard-Module, keine Fachlogik in Client-Komponenten.

- Document-Inbox: Upload-Drag&Drop, Job-Fortschritt, Status-Badges je Dokument.
- Extraction-Viewer: Original-PDF mit Overlay der extrahierten Felder/Bounding-Boxes, editierbar.
- Classification-Review: Queue zweifelhafter Klassifikationen mit Accept/Override.
- Entity-Linking-Panel: zeigt verknüpfte Band 51 Concepts je Dokument.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation), Abdeckung Erfolgs-/Fehlerpfade.

- Unit: Parser für PDF/DOCX/XLSX, Zod-Feldvalidierung je Dokumenttyp, Entity-Linking-Match.
- Integration: Upload→Analyzed→Indexed Roundtrip; Event→Band 52 Index-Eintrag.
- Security: Cross-Tenant-Dokumentzugriff mit 403; tenantId-Filter in allen Repositories.
- Robustness: korrupte/leere Dateien → graceful Error + Job-Status `failed`.

## Kapitel 9 – Security

Authentifizierung über bestehendes System (keine zweite), Autorisierung via `requireApiPermission`, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- `requireApiPermission("documents:read" | "documents:write" | "documents:review")` je Endpunkt.
- Originale in tenant-gekapseltem Band 15 Object-Store mit signed URLs, nie öffentlich.
- PII in Feldern als sensibel markiert; Audit für jedes Feld-Review. DSGVO-Löschung kaskadiert.
- Keine Dokumentinhalte in Logs/Events; nur Referenzen.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Composite-Index (tenantId, docType, status); Index auf DocumentField (tenantId, name).
- Parsing/Extraktion asynchron via Band 11 Queue; große PDFs in Seiten-Batches verarbeitet.
- Cache: Klassifikations-Modell-Ergebnisse kurzzeitig je Dokument-Hash (tenantKey).
- Ziel: Ingestion p95 < 5 s (bis 50 Seiten), Feld-Extraktion p95 < 2 s, Suche p95 < 80 ms.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Tenant-Isolation-Test grün. 8. Parser-Roundtrip für alle unterstützten Formate grün.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
