# CarryOS Universe – Band 06
# Masterprompt: APIs & Contracts (VOLLSTÄNDIG)

> Band: 6 | Masterprompt: 6.0 | Status: PLANNED | Gruppe: Foundation
> Abhängigkeit: Band 1 (Vision/Strategie)

> Hinweis: Planungs-Masterprompt. Definiert API-Verträge, Envelope-Standard, Zod-Validation und Versionierung für CarryOS Core. Builds auf Band 10 (API Governance) auf, ohne Core-Fork.

## Kapitel 1 – Architektur

- Einheitlicher API-Layer: alle Endpunkte nutzen `withApiContext` + Zod-Validation + Envelope-Antwort (Band 10 Standard).
- Route Handler sind dünn: Kontext → Validate → Delegate (Service) → Envelope; keine Fachlogik im Handler.
- Contract-First: Zod-Schema ist Quelle für Validierung UND Typinferenz, keine doppelten TS-Typen.
- Versionierung im Pfad (`/api/v1/...`), Breaking Changes nur mit neuer Versionsnummer, niemals stille Änderung.
- Keine zweite API-Schicht; alle Editionen/Apps konsumieren denselben Core-API-Helfer.

## Kapitel 2 – Datenmodelle

- Request/Response-DTOs abgeleitet aus Prisma-Typen via Zod, niemals rohe DB-Objekte im Response.
- Jeder Contract trägt impliziten tenantId-Scope; Response enthält nie Felder fremder Tenants.
- Pagination/Filter als standardisierte Zod-Schemas (page, pageSize, sort, filter), serverseitig erzwungen.
- Money/Werte als typisierte Value Objects im Contract, nicht als rohe number/string.
- Error-Model: `{ code, message, requestId, details? }` im Envelope, niemals Stacktrace nach außen.

## Kapitel 3 – APIs

- Envelope-Format verbindlich: `{ ok: boolean, data?, error?, meta? }`, meta für Pagination/RequestId.
- Endpunkte: GET (lesen, paginiert), POST (create, idempotent via ExecutionKey), PUT/PATCH (update), DELETE (soft).
- Zod-Validation an Handler-Eintritt; fehlgeschlagene Validierung → 422 mit strukturiertem Error (Feldliste).
- Autorisierung via `requireApiPermission` im Service-Entry, nicht im Handler verteilt.
- OpenAPI-Spec wird aus Zod-Schemas generiert, keine manuell divergierende Dokumentation.

## Kapitel 4 – Events

- API-ausgelöste Mutationen emitieren Domain Events über Outbox (Band 5), niemals direkter Emit im Handler.
- Event-Contracts teilen Zod-Schemas mit API-Contracts wo sinnvoll (z. B. `invoice.created.v1` nutzt Invoice-DTO).
- Versionierung von Events unabhängig von API-Version, aber konsistent dokumentiert im Contract-Index.
- Tenant-Isolation: Event aus API-Kontext trägt tenantId des Requests, Consumer filtern streng.
- Keine synchronen Event-Antworten in API; langläufige Prozesse via Workflow/Event, Status abfragbar.

## Kapitel 5 – Workflows

- API-Request folgt: withApiContext → Zod → requireApiPermission → Service → Repository → Outbox → Envelope.
- Idempotenz: POST-Endpunkte nehmen/ableiten ExecutionKey, Duplicate liefert Original-Result (No-Op).
- Long-running via Workflow (Band 9): API startet Run, gibt `runId` zurück, Status über separaten GET abfragbar.
- Validierungsfehler und Domain-Fehler sind unterschiedliche Envelope-Errors (422 vs 409/403), kein Generic-500.
- Audit: kritische Mutations-APIs schreiben AuditLog (tenantId, actor, endpoint, payload hash).

## Kapitel 6 – Agenten

- Agenten konsumieren APIs ausschließlich über geprüfte Clients/Tools, keine ungeprüften Direktaufrufe.
- Agent-gesteuerte Endpunkte nutzen denselben Envelope/Zod-Standard, keine Agent-spezifische Sonder-API.
- Agent-Context (tenantId, workspaceId, role) wird zentral injiziert, nicht pro Request manuell übergeben.
- Keine zweite API-Exposition für Agenten; Band 11 Runtime nutzt Core-APIs.
- Agent-Aufrufe auditiert + tenant-isolierbar, Rate-Limiting pro Tenant verpflichtend.

## Kapitel 7 – UI

- UI konsumiert ausschließlich Envelope-Responses; Client validiert gegen gleiche Zod-Schemas (Shared Validation).
- Fehlerbehandlung: Envelope-Error wird mapping zu UI-State, keine rohen HTTP-Codes im Client verzweigt.
- Tenant-Scoped Listen serverseitig gefiltert + paginiert, Client fordert nur page/sort an.
- Keine Fachlogik in Client Components; Mapping/Derivation in Service/API.
- Design-System aus Core (Band 3), keine eigenen Response-Rendering-Duplikate.

## Kapitel 8 – Tests

- Contract-Tests: Zod-Schemas gegen Beispiel-Requests/Responses, Validierung beider Richtungen.
- Handler-Tests: dünner Handler delegiert korrekt, Envelope-Formate für Erfolg/Fehler validiert.
- Integrationstests: echte API gegen Tenant-Fixtures, verifizieren tenantId-Isolation der Responses.
- Idempotenz-Tests: POST mit gleichem ExecutionKey zweimal → identisches Result, keine Doppelmutation.
- Architekturtests: verbieten Fachlogik in Routes, fehlendes Zod-Schema, fehlende Envelope-Antwort.

## Kapitel 9 – Security

- Authentifizierung zentral (eine Instanz), Token/Session im withApiContext validiert, keine zweite Auth.
- Autorisierung via requireApiPermission, Rollen/Scopes serverseitig, niemals client-gesteuert.
- tenantId im Kontext zwingend; Endpunkte ohne Tenant-Scope werden durch Architekturtest abgelehnt.
- Secrets niemals in Request/Response/Logs; sensible Felder über Referenz, nicht als Wert.
- Rate-Limiting + Audit auf kritischen Endpunkten, tenant-zuordbar, tamper-resistent.

## Kapitel 10 – Performance

- p95-Ziele: Lese < 200ms, Schreib < 300ms unter Testlast; Envelope-Overhead minimal (kein Heavy-Payload).
- Validation-Caching: Zod-Schemas kompiliert (lazy), keine Re-Parse-Kosten pro Request.
- Pagination verpflichtend für Listen, Default pageSize gedeckelt, keine unbounded Responses.
- Indizes auf tenantId für alle abgefragten Entitäten, Query-Plan-Check in Integrationstests.
- Caching tenant-scoped (Cache-Key enthält tenantId), niemals globaler Cache mit Tenant-Daten.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün (Architekturtests). 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests (Tenant-Isolation) grün. 6. Contract-Tests grün.
7. OpenAPI-Generierung aus Zod erfolgreich.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
