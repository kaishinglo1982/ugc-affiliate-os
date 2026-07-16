# CarryOS Universe – Band 54
# Masterprompt: OCR & Vision (VOLLSTÄNDIG)

> Band: 54 | Masterprompt: 54.0 | Status: PLANNED | Gruppe: AI & Automation
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Planungs-Masterprompt. Implementierung erfolgt bandweise über Swarm/Codex, baut auf CarryOS Core + Band 11 Agent Runtime + Band 53 Dokumentenanalyse auf.

## Kapitel 1 – Architektur

OCR & Vision liefert die visuelle Wahrnehmungsschicht: Texterkennung aus Bildern/Scans, Layout-Analyse, Objekt-/Logo-Erkennung und Tabellen-Extraktion. Es ist die unterste Ebene von Band 53 und nutzt gekapselte Vision-Bibliotheken (Tesseract, EasyOCR) bzw. freie Modelle statt einer zweiten Vision-Engine. Band 11 Agent Runtime orchestriert die Pipelines.

- OCR-Pipeline: Preprocessing (Deskew/Denoise) → Text-Detection → Recognition → Reading-Order → hOCR/ALTO-Ausgabe.
- Vision-Pipeline: Object/Logo/Table Detection via freiem Modell (z. B. YOLO/LayoutLM), Bounding-Boxes als strukturierte Metadaten.
- Table-Extraction: erkennt Gitterstrukturen, mappt Zellen → tabellarische Records für Band 53.
- Storage-Bridge: Bilder/Scans in Band 15 Object-Store (tenant-gekapselt), Erkenntnisse in Prisma.
- Free-First: Tesseract/EasyOCR lokal; kommerzielles Vision-API nur bei Freigabe + Free-Tier unzureichend.

## Kapitel 2 – Datenmodelle

Vision-Daten streng tenant-isoliert; Bild-Bytes nie in DB, nur Referenzen + Annotationen.

- `VisionAsset`: id, tenantId, sourceRef, mimeType, width, height, dpi, lang, status.
- `OcrResult`: id, tenantId, assetId, engine, modelVersion, text, confidence, hocrRef.
- `VisionAnnotation`: id, tenantId, assetId, kind (text|logo|object|table|signature), bbox, label, score.
- `TableCell`: id, tenantId, assetId, tableIdx, row, col, text, confidence.
- `VisionJob`: id, tenantId, status, assetRef, requestedTasks[], progress, error.
- Unique-Index (tenantId, sourceRef); Soft-Delete via deletedAt.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod), Versionierung `/api/v1/vision/*`.

- `POST /api/v1/vision/analyze` – Asset referenzieren + Tasks (ocr|detect|table) triggern, idempotent.
- `GET /api/v1/vision/assets/:id` – Asset-Metadaten + Annotationen, tenant-gefiltert.
- `GET /api/v1/vision/assets/:id/ocr` – OCR-Text mit Zeilen/Bounding-Boxes + Confidence.
- `POST /api/v1/vision/assets/:id/table` – Tabellen-Extraktion erzwingen, liefert Zellen-Matrix.
- `POST /api/v1/vision/assets/:id/annotate` – manuelle Korrektur einer Annotation (Audit).
- `GET /api/v1/vision/search` – Suche nach erkannten Labels/Texten über tenant-Index.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue (Band 15), Namensschema `vision.*.v1`.

- `vision.asset.stored.v1` – Bild/Scan gespeichert, inkl. mimeType, dimensionen, tenantId.
- `vision.ocr.completed.v1` – Texterkennung fertig, verlinkt Band 53 Dokument zur Weiterverarbeitung.
- `vision.annotation.created.v1` – Detektion (logo/object/table) abgeschlossen mit Bounding-Boxes.
- `vision.table.extracted.v1` – Tabelle als Zellen-Records extrahiert, an Band 53 übergeben.
- Keine Bildinhalte in Events; nur Referenzen + Annotation-Metadaten, tenantId Pflichtfeld.

## Kapitel 5 – Workflows

Prozesse folgen Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope; idempotent via ExecutionKey.

- OCR-Workflow: Asset-Store → Preprocessing → Detection → Recognition → Reading-Order → Persistenz → `vision.ocr.completed.v1` → Band 53.
- Detection-Workflow: Asset → Modell-Inferenz → NMS-Filter → Annotation-Persistenz → Event.
- Table-Workflow: Asset → Grid-Detection → Cell-Mapping → Normalisierung → `vision.table.extracted.v1`.
- Correction-Workflow: manuelle Annotation-Korrektur → Audit + Re-Derivation in Band 53.

## Kapitel 6 – Agenten

Agenten/Rollen in der Band 11 Runtime registriert, keine eigene Vision-Engine.

- `ocr-agent`: führt Preprocessing + Texterkennung aus, liefert hOCR + Confidence je Zeile.
- `vision-detector-agent`: erkennt Logos/Objekte/Signaturen mit freiem Detektionsmodell.
- `table-extractor-agent`: extrahiert Gittertabellen zu strukturierten Zellen-Records.
- `vision-qa-agent`: prüft Erkennungsqualität (unscharf/unvollständig) und meldet Nachbearbeitung.

## Kapitel 7 – UI

Vision-Oberfläche als Dashboard-Module, keine Fachlogik in Client-Komponenten.

- Vision-Uploader: Bild/Scan hochladen, Task-Auswahl (OCR/Detect/Table), Job-Fortschritt.
- OCR-Overlay-Viewer: Bild mit Text-Layern + editierbaren Bounding-Boxes.
- Annotation-Canvas: zeigt erkannte Logos/Objekte/Tabellen zur Bestätigung/Korrektur.
- Table-Grid-Editor: extrahierte Tabelle als editierbare Matrix mit Zellen-Confidence.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation), Abdeckung Erfolgs-/Fehlerpfade.

- Unit: Preprocessing-Filter, Bounding-Box-NMS, Table-Grid-Rekonstruktion, Confidence-Berechnung.
- Integration: Asset→OCR→Band 53 Roundtrip; Event→Dokumenten-Record-Erstellung.
- Security: Cross-Tenant-Asset-Zugriff mit 403; tenantId-Filter in allen Repositories.
- Format-Tests: JPG/PNG/PDF-Scan/TIFF mit Drehung/Rauschen → robuste Erkennung.

## Kapitel 9 – Security

Authentifizierung über bestehendes System (keine zweite), Autorisierung via `requireApiPermission`, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- `requireApiPermission("vision:read" | "vision:write" | "vision:annotate")` je Endpunkt.
- Assets in tenant-gekapseltem Object-Store mit signed URLs; niemals öffentlich indexierbar.
- Vision-API-Keys im Band 15 Secrets-Store; keine Bildinhalte in Logs/Events.
- DSGVO: Löschung löscht Asset + Annotationen kaskadiert je Tenant.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Composite-Index (tenantId, mimeType, status); Index auf VisionAnnotation (tenantId, kind).
- Inferenz asynchron via Band 11 Queue; Bilder vorverarbeitet in GPU/CPU-Pool, batched.
- Cache: wiedererkennung gleicher Asset-Hash (tenantKey) übersprungen.
- Ziel: OCR einer A4-Seite p95 < 3 s, Detection p95 < 1,5 s, Table-Extraktion p95 < 4 s.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Tenant-Isolation-Test grün. 8. OCR-Roundtrip für gedrehte/verrauschte Scans grün.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
