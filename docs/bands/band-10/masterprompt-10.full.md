# CarryOS Universe – Band 10
# Masterprompt: API Governance & Backend Standards (VOLLSTÄNDIG)

> Band: 10
> Masterprompt: 10.0 (vollständig, konsolidiert)
> Status: IMPLEMENTING
> Abhängigkeit: keine (Einstiegsband)
> Ziel: Verbindlicher Backend-Standard für alle CarryOS-Module, Brancheneditionen und Plugins.

---

## Kapitel 1 – Architektur

### 1.1 Prinzip

Band 10 definiert den verbindlichen technischen Standard für alle
Backend-Module von CarryOS. Alle späteren Bänder (11–16) bauen auf diesen
Regeln auf. Bestehende Systeme werden erweitert, niemals dupliziert.

### 1.2 Schichtenmodell

```
Client
  → Route Handler (Orchestrierung nur)
    → Validation (Zod)
    → Authorization (guard.ts / requireApiPermission)
    → Service Layer (Fachlogik, src/server/services)
      → Repository Layer (Datenzugriff, src/server/repositories)
        → Database (Prisma, tenant-gefiltert)
```

Fachlogik gehört ausschließlich in die Service Layer. Route Handler dürfen
nur Orchestrierung, Envelope und Kontext-Auflösung enthalten.

### 1.3 Verbotene Parallelstrukturen

- Keine zweite Authentifizierung
- Keine zweite Agent Runtime
- Keine zweite Workflow Engine
- Keine zweite EventBus-/Queue-Architektur
- Keine zweite Finance Engine

### 1.4 Request-Kontext

Jeder Request enthält serverseitig abgeleitet:

- `tenantId` (aus verifiziertem Token)
- `workspaceId` (optional, aus Kontext)
- `userId` (aus verifiziertem Token)
- `correlationId` (tracing)
- `requestId` (response envelope)

Diese Werte dürfen nicht ungeprüft vom Client übernommen werden.

### 1.5 Bestehende Artefakte (Ist-Zustand)

- `src/lib/api/guard.ts` — `requireApiPermission`, Token-Handling
- `src/lib/api/response.ts` — einheitlicher Envelope (`ok`, `fail`, ...)
- `src/lib/api/validate.ts` — Zod-Helper (`parseBody`, `uuidSchema`, ...)
- `src/lib/api/route-context.ts` — `withApiContext(permission)`
- `src/lib/api/index.ts` — Barrel-Export

Diese werden erweitert, nicht ersetzt.

---

## Kapitel 2 – Datenmodelle

### 2.1 Prinzip

Datenmodelle werden in Prisma definiert. Tenant-Isolation ist durchgehend
Pflicht. Kein Modell ohne `tenantId`-Filter in Zugriffspfaden.

### 2.2 Relevante Entitäten für Band 10

- `ApiAuditLog` (Vorschlag): protokolliert kritische API-Zugriffe
  - `id`, `tenantId`, `userId`, `route`, `permission`, `status`, `createdAt`
- `IdempotencyKey` (Vorschlag): verhindert Doppeleffekte
  - `key`, `tenantId`, `result` (JSON), `expiresAt`

### 2.3 Migration-Regeln

- Data Platform owns Schema-Änderungen.
- Bereits angewandte Migrationen werden nicht überschrieben.
- Jede neue Spalte mit Tenant-Bezug erhält Index auf `tenantId`.

---

## Kapitel 3 – APIs

### 3.1 Konventionen

- REST, Ressourcen-orientiert, Plural-Nomen.
- Versionierung im Pfad: `/api/v1/...`.
- Breaking Changes nur über neue Version.
- JSON-Content-Type.

### 3.2 Response-Standard

Erfolg:

```json
{ "success": true, "data": {}, "meta": {} }
```

Fehler:

```json
{
  "success": false,
  "error": { "code": "ERROR_CODE", "message": "Beschreibung", "fieldErrors": {} }
}
```

### 3.3 Fehlerkatalog (Auszug)

| Code | HTTP | Bedeutung |
| ---- | ---- | --------- |
| VALIDATION_ERROR | 400 | Zod-Validierung fehlgeschlagen |
| UNAUTHORIZED | 401 | Ungültiges/fehlendes Token |
| FORBIDDEN | 403 | Permission fehlt |
| NOT_FOUND | 404 | Ressource nicht vorhanden |
| IDEMPOTENCY_CONFLICT | 409 | Key bereits mit anderem Result |
| RATE_LIMITED | 429 | Budget erschöpft |
| INTERNAL_ERROR | 500 | Serverfehler (Details nicht nach außen) |

### 3.4 OpenAPI

Jede Route muss dokumentiert werden: Request, Response, Fehlercodes,
Berechtigungen, Beispiele.

---

## Kapitel 4 – Events

### 4.1 Prinzip

Kritische Änderungen erzeugen versionierte Events über die bestehende
EventBus-/Queue-Architektur (keine zweite).

### 4.2 Event-Beispiele

- `api.request.completed.v1`
- `api.validation.failed.v1`
- `api.permission.denied.v1`

### 4.3 Event Outbox

Events werden über eine Outbox-Tabelle persistiert und durch den
vorhandenen Dispatcher ausgeliefert (at-least-once, idempotent konsumiert).

---

## Kapitel 5 – Workflows

### 5.1 Request-Flow

```
Request
 → route-context (withApiContext) löst Tenant/User/Permission
 → parseBody (Zod)
 → Service-Aufruf (Fachlogik)
 → Repository-Aufruf (Daten)
 → Response-Envelope (ok/fail)
```

### 5.2 Validierungs-Workflow

- `parseBody(schema)` → bei Fehler `badRequest` mit `fieldErrors`.
- Kein Fallback auf `unknown` ohne Schema.

### 5.3 Idempotenz-Workflow

- Schreib-Endpunkte prüfen `IdempotencyKey`.
- Gleicher Key → gespeichertes Result zurückgegeben.

---

## Kapitel 6 – Agenten

Band 10 definiert keine Agenten-Logik (siehe Band 11). Es stellt jedoch
den API-Standard bereit, den Agent-Endpunkte in Band 11 nutzen. Alle
Agent-Routen MÜSSEN `withApiContext` und den Response-Envelope verwenden.

---

## Kapitel 7 – UI

Band 10 betrifft primär Backend. Die UI nutzt die einheitlichen
API-Antworten; Fehler werden konsistent über den Envelope gerendert.
Keine Geschäftslogik in Client-Komponenten.

---

## Kapitel 8 – Tests

### 8.1 Unit-Tests (Vitest)

- `src/lib/api/response.test.ts`
- `src/lib/api/validate.test.ts`
- `src/lib/api/route-context.test.ts`

Abdeckung: Erfolgs- und Fehlerpfade, Tenant-Isolation, Idempotenz-Helper.

### 8.2 Integrationstests

- Kritische Routen mit DB-Kontext.
- Tenant-Isolation: Cross-Tenant-Zugriff muss `403`/`404` erzeugen.

### 8.3 Architekturtests

- Keine zweite Runtime/Engine.
- Fachlogik nicht in Route Handlern.

---

## Kapitel 9 – Security

### 9.1 Authentifizierung

- Bestehende Auth erweitern, keine zweite.
- Tokens serverseitig verifizieren.

### 9.2 Autorisierung

- `requireApiPermission` deklariert benötigte Permission pro Route.

### 9.3 Tenant-Isolation

- `tenantId` aus Kontext, nie aus Body.
- DB-Queries durchgehend tenant-gefiltert.

### 9.4 Rate Limiting

- Öffentliche Endpunkte erhalten Budget → `429`.

### 9.5 Secrets

- Keine Secrets in Code, Logs, Prompts, Dokumentation.

---

## Kapitel 10 – Performance

### 10.1 Envelope-Overhead

- Envelope-Serialisierung muss < 1 ms für typische Payloads sein.

### 10.2 Validierung

- Zod-Schemas werden gecached (nicht pro Request neu kompiliert).

### 10.3 Indizes

- Alle tenant-gefilterten Queries nutzen Index auf `tenantId`.

### 10.4 Rate Limit

- In-Memory oder Redis-Counter mit TTL, keine SYNCHRONEN DB-Locks.

---

## Quality Gates

1. TypeScript Strict, keine `any`.
2. Lint grün.
3. Typecheck grün.
4. Unit-Tests grün.
5. Integrationstests grün.
6. Architekturtests grün.

Tatsächliche Befehle und Ausgaben gehören in den Abschlussbericht.
Erfundene grüne Ergebnisse sind untersagt.

---

## Abschlussbericht (Struktur)

1. Ausgangszustand
2. Gap-Analyse
3. erstellte Dateien
4. geänderte Dateien
5. Datenbankänderungen
6. APIs und Events
7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse
9. offene Blocker
10. technische Schulden
11. Empfehlung für den nächsten Schritt
