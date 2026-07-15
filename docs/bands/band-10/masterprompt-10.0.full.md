# CarryOS Universe – Band 10
# Masterprompt 10.0 – API Governance & Backend Standards (VOLLSTÄNDIG, TEIL-SYNTHESE)

> Band: 10 | Masterprompt: 10.0 (vollständig) | Status: IMPLEMENTING
> Aufbau: 8 Teile (Vision/Architektur, API-Konventionen, Request/Response,
> Auth, Fehler/OpenAPI, Idempotenz/Versionierung, Quality Gates, Tests/Bericht)

# Band 10 – Masterprompt 10.0, Teil 1: Vision & Architektur

## 1.1 Vision

CarryOS ist eine modulare, mandantenfähige Enterprise-Plattform. Band 10
etabliert den verbindlichen Backend-Standard, auf dem alle Module,
Brancheneditionen und Plugins aufbauen. Ziel ist eine einzige, konsistente
API-Oberfläche über das gesamte Ökosystem, unabhängig davon, welches Modul,
welche Edition oder welches Plugin gerade angesprochen wird.

## 1.2 Strategische Prinzipien

- **Ein Standard, keine Inseln.** Jede Route folgt demselben Envelope,
  derselben Validierung, derselben Autorisierung.
- **Erweiterung vor Duplikation.** Bestehende `src/lib/api/*` werden
  erweitert, niemals kopiert.
- **Sicherheit by Design.** Tenant-Isolation und Autorisierung sind kein
  optionaler Aufsatz, sondern Teil des Request-Kontexts.
- **Auditierbarkeit.** Jede kritische Änderung erzeugt ein versioniertes
  Event und einen Audit-Eintrag.
- **Maschinenlesbarkeit.** Jede Route ist OpenAPI-dokumentiert.

## 1.3 Architektur-Schichten

```
Client
  → Route Handler            (Orchestrierung, Kontext, Envelope)
    → Validation             (Zod, parseBody)
    → Authorization          (guard.ts: requireApiPermission)
    → Service Layer          (Fachlogik, src/server/services)
      → Repository Layer     (Datenzugriff, src/server/repositories)
        → Database           (Prisma, tenant-gefiltert)
```

Regel: Fachlogik ausschließlich in der Service Layer. Route Handler dürfen
nur Orchestrierung, Envelope-Aufbau und Kontext-Auflösung enthalten.

## 1.4 Request-Kontext (serverseitig abgeleitet)

| Feld | Quelle | Darf vom Client kommen? |
| ---- | ------ | ----------------------- |
| tenantId | verifiziertes Token | nein |
| workspaceId | Kontext/Token | nein |
| userId | verifiziertes Token | nein |
| correlationId | Tracing-Middleware | nein (Header optional) |
| requestId | Response-Envelope | nein |

Diese Werte werden niemals ungeprüft aus dem Body übernommen.

## 1.5 Verbotene Parallelstrukturen

- Keine zweite Authentifizierung
- Keine zweite Agent Runtime
- Keine zweite Workflow Engine
- Keine zweite EventBus-/Queue-Architektur
- Keine zweite Finance Engine

## 1.6 Bestehende Artefakte (Ist-Zustand, nicht neu erfinden)

- `src/lib/api/guard.ts` — `requireApiPermission`, Token-Handling
- `src/lib/api/response.ts` — Envelope (`ok`, `created`, `fail`, ...)
- `src/lib/api/validate.ts` — Zod-Helper (`parseBody`, `uuidSchema`, ...)
- `src/lib/api/route-context.ts` — `withApiContext(permission)`
- `src/lib/api/index.ts` — Barrel-Export

## 1.7 Abhängigkeiten

Band 10 ist der Einstiegsband. Er hat keine Upstream-Abhängigkeit, aber alle
späteren Bänder (11–16) hängen von seinem Standard ab.

## 1.8 Nicht-Ziele

- Keine Fachlogik (gehört in die Fachmodule/Bänder 12–14).
- Keine neue Agenten-Laufzeit (Band 11).
- Keine neue Finance-Engine (Band 14).

---

# Band 10 – Masterprompt 10.0, Teil 2: API-Konventionen

## 2.1 REST-Konventionen

- Ressourcen-orientiert, Plural-Nomen: `/api/v1/experiments`, `/api/v1/recommendations`.
- HTTPS only in Produktion.
- JSON `Content-Type: application/json`.
- Nesting maximal 2 Ebenen: `/api/v1/experiments/{id}/analyze`.
- Query-Parameter für Filter/Sortierung/Pagination.

## 2.2 Versionierung

- Version im Pfad: `/api/v1/...`.
- Breaking Changes nur über neue Version (`/api/v2/...`).
- Deprecation wird in OpenAPI markiert (`deprecated: true`) plus `Sunset`-Header.
- Alte Versionen mindestens 6 Monate parallel geführt.

## 2.3 HTTP-Methoden

| Methode | Semantik | Idempotent |
| ------- | -------- | ---------- |
| GET | lesen | ja |
| POST | erstellen / Aktion | nein (außer via IdempotencyKey) |
| PUT | ersetzen | ja |
| PATCH | teilweise ändern | nein |
| DELETE | löschen | ja |

## 2.4 Pagination

- Cursor-basiert: `?cursor=...&limit=20`.
- Response enthält `meta: { nextCursor, total }`.
- Max `limit=100`.

## 2.5 Filter & Sortierung

- Filter: `?status=running&tenant=...` (tenant wird serverseitig erzwungen).
- Sortierung: `?sort=-createdAt,status`.

## 2.6 Status-Codes

| Code | Bedeutung |
| ---- | --------- |
| 200 | OK (GET/PUT/PATCH/DELETE) |
| 201 | Created (POST) |
| 202 | Accepted (async) |
| 400 | Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (Idempotency/Unique) |
| 429 | Rate Limited |
| 500 | Internal Error |

## 2.7 Hypermedia (optional)

Erfolgs-Responses dürfen `links` in `meta` enthalten für verwandte Endpunkte.

## 2.8 Konsistenzregel

Alle Routen MÜSSEN den Envelope aus Teil 3 nutzen. Routen, die eigenes
`NextResponse.json({ error })` bauen, sind ein Verstoß und werden im
Scope von Masterprompt 10.0 (Implementierung) migriert.

---

# Band 10 – Masterprompt 10.0, Teil 3: Request-/Response-Standards

## 3.1 Erfolgs-Envelope

```json
{
  "success": true,
  "data": { },
  "meta": {
    "requestId": "req_abc",
    "correlationId": "corr_xyz",
    "nextCursor": null,
    "total": 1
  }
}
```

Implementierung: `src/lib/api/response.ts` → `ok(data, meta?)`,
`created(data, meta?)`.

## 3.2 Fehler-Envelope

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Eingabe ungültig.",
    "fieldErrors": { "assetId": ["assetId erforderlich."] }
  },
  "meta": { "requestId": "req_abc" }
}
```

Implementierung: `fail(code, message, fieldErrors?)`, `badRequest`,
`unauthorized`, `forbidden`, `notFound`, `serverError`.

## 3.3 Feld-Konventionen

- `id`, `tenantId` als String (UUID).
- Zeitstempel als ISO-8601 UTC: `2026-07-16T12:00:00.000Z`.
- Geldwerte als Integer in kleinster Einheit (Cents) oder als decimal-String.
- Booleans explizit, keine 0/1.

## 3.4 Request-Body-Standard

- Immer JSON.
- Leere Bodies nur bei GET/DELETE.
- `Content-Type` mismatch → `415`.

## 3.5 Validierung (Zod)

Jede Mutation validiert den Body über Zod:

```ts
const schema = z.object({ assetId: z.string().uuid() });
const body = await parseBody(request, schema); // throws → badRequest mit fieldErrors
```

Implementierung: `src/lib/api/validate.ts` → `parseBody`, `validateValue`,
`requireQueryParam`, `uuidSchema`.

## 3.6 Response-Zeitfenster

- GET < 300 ms (p95)
- Mutation < 800 ms (p95)
- Async-Operationen antworten mit `202` + `Location`-Header zur Status-Abfrage.

## 3.7 Lokalisierung

`message` im Envelope ist menschenlesbar (DE/EN nach `Accept-Language`).
`code` ist sprachunabhängig und wird von Clients gemappt.

## 3.8 Beispiel-Route (Zielzustand)

```ts
export const POST = withApiContext("experiment:create")(async (ctx, request) => {
  const body = await parseBody(request, createExperimentSchema);
  const experiment = await experimentService.create(ctx.tenantId, body);
  return created(experiment);
});
```

---

# Band 10 – Masterprompt 10.0, Teil 4: Authentifizierung & Autorisierung

## 4.1 Authentifizierung

- Bestehende Auth-Lösung erweitern, **keine zweite**.
- Tokens werden serverseitig verifiziert (nie vom Client vertrauen).
- `tenantId`, `userId` werden aus dem verifizierten Token abgeleitet.
- Abgelaufene/ungültige Tokens → `401` mit `UNAUTHORIZED`.

## 4.2 Autorisierung

- Jede Route deklariert benötigte Permission via `withApiContext(permission)`.
- `requireApiPermission` (in `guard.ts`) prüft das Permission-Flag.
- Fehlendes Permission → `403` mit `FORBIDDEN`.

## 4.3 Permissions-Modell

- Permissions sind Strings: `resource:action` (z.B. `experiment:create`).
- Rollen bündeln Permissions (kein Freetext-Role-Check in Routen).
- Tenant-Scoping ist implizit: Permission gilt nur innerhalb des eigenen Tenant.

## 4.4 Tenant-Isolation (kritisch)

- `tenantId` kommt aus dem Token-Kontext, nie aus dem Body/Query.
- Jede DB-Query enthält den Tenant-Filter.
- Cross-Tenant-Zugriff ist ein Security-Verstoß → `403`/`404` (kein `401`,
  um Existenz nicht preiszugeben).

## 4.5 Workspace-Isolation

- `workspaceId` ist optional, aber wenn vorhanden, muss die Route den Zugriff
  auf den Workspace des Tenant beschränken.
- Kein Zugriff über Workspace-Grenzen hinweg.

## 4.6 Service-to-Service

- Interne Worker/Queue-Aufrufe nutzen `WORKER_SECRET` (siehe deploy-roadmap).
- `WORKER_SECRET` darf nie im Client, in Logs oder in Docs erscheinen.

## 4.7 Token-Lebenszyklus

- Access-Token kurzlebig (<= 15 min).
- Refresh über bestehenden Flow, kein neuer Auth-Mechanismus.

## 4.8 Rate Limiting

- Öffentliche/authentifizierte Endpunkte erhalten ein Budget.
- Überschreitung → `429` mit `Retry-After`.
- Counter über In-Memory oder Redis mit TTL (kein synchrones DB-Lock).

## 4.9 Audit

- Kritische Aktionen (Permission-Wechsel, Finance, Tenant-Daten) erzeugen
  einen `ApiAuditLog`-Eintrag (siehe Teil 5 / Datenmodelle).
- Audit schreibt niemals Secrets oder vollständige sensitive Payloads.

---

# Band 10 – Masterprompt 10.0, Teil 5: Fehlerbehandlung & OpenAPI

## 5.1 Fehlerkatalog

| Code | HTTP | Bedeutung |
| ---- | ---- | --------- |
| VALIDATION_ERROR | 400 | Zod-Validierung fehlgeschlagen |
| INVALID_QUERY | 400 | Ungültiger Query-Parameter |
| UNAUTHORIZED | 401 | Ungültiges/fehlendes Token |
| FORBIDDEN | 403 | Permission fehlt |
| NOT_FOUND | 404 | Ressource nicht vorhanden |
| CONFLICT | 409 | Unique/Idempotency-Konflikt |
| RATE_LIMITED | 429 | Budget erschöpft |
| INTERNAL_ERROR | 500 | Serverfehler |

## 5.2 Fehlerbehandlung in Routen

- Erwartete Fehler → Envelope mit passendem `code`.
- Unerwartete Fehler → `serverError()`, Details nur in Logs (nie nach außen).
- `try/catch` pro Route über `withApiContext` gekapselt.

## 5.3 Logging

- `requestId`, `tenantId`, `userId`, Route, Dauer, Status.
- Keine Secrets, keine vollständigen sensitiven Payloads.
- Strukturiertes JSON-Log via `src/lib/observability`.

## 5.4 OpenAPI-Dokumentation

Jede Route MUSS dokumentiert werden:

- Request-Schema (Zod → OpenAPI)
- Response-Schema (Erfolg + Fehler)
- Fehlercodes (aus 5.1)
- Benötigte Permission
- Beispiele (request/response)

Generierung: bestehendes OpenAPI-Tooling erweitern; keinen zweiten Generator.

## 5.5 Deprecation-Prozess

- Route als `deprecated` markieren.
- `Sunset`-Header mit Datum setzen.
- Migration Guide in der API-Docs verlinken.

## 5.6 Konsistenz-Check

Architekturtest prüft: jede Datei in `src/app/api/**/route.ts` nutzt den
Envelope (kein rohes `NextResponse.json({ error })` ohne `success`-Feld).

---

# Band 10 – Masterprompt 10.0, Teil 6: Idempotenz & Versionierung

## 6.1 Idempotenz

- Schreib-Endpunkte akzeptieren Header `Idempotency-Key` (UUID).
- Bei bekanntem Key wird das gespeicherte Result zurückgegeben (kein
  Doppeleffekt).
- Key ist tenant-gebunden (`tenantId` + `key` als unique).

## 6.2 Idempotency-Speicher

- Tabelle `IdempotencyKey { key, tenantId, result, expiresAt }`.
- TTL 24 h; abgelaufene Keys werden bereinigt.
- Concurrent Requests mit gleichem Key: erstes gewinnt, weitere erhalten
  dasselbe Result (oder `409` bei Inkonsistenz).

## 6.3 Versionierung der Payloads

- Breaking Changes am Body → neue API-Version (`/api/v2/`).
- Non-breaking Changes (neue optionale Felder) → selbe Version, `meta.schemaVersion`.
- Events sind versioniert (`event.name.v1`).

## 6.4 Migration zwischen Versionen

- Beide Versionen parallel (>= 6 Monate).
- Mapping-Layer zwischen Versionen in der Service-Schicht, nicht in der Route.
- Deprecation-Hinweis in OpenAPI.

## 6.5 Beispiel

```ts
const key = request.headers.get("Idempotency-Key");
if (key) {
  const cached = await idempotency.get(ctx.tenantId, key);
  if (cached) return ok(cached);
}
const result = await service.create(ctx.tenantId, body);
if (key) await idempotency.store(ctx.tenantId, key, result);
return created(result);
```

## 6.6 Regeln

- GET/DELETE/PUT sind nativ idempotent.
- Nur POST-Aktionen benötigen `Idempotency-Key`.
- Key wird niemals vom Client als Auth-Substitut genutzt.

---

# Band 10 – Masterprompt 10.0, Teil 7: Quality Gates

## 7.1 Verbindliche Gates

1. **TypeScript Strict** — `strict: true`, keine `any` in neuem Code.
2. **Lint** — `eslint` ohne Errors, keine neuen Warning-Typen.
3. **Typecheck** — `tsc --noEmit` fehlerfrei.
4. **Unit-Tests** — Vitest, neue Module erhalten Tests.
5. **Integrationstests** — kritische Pfade mit DB-Kontext.
6. **Architekturtests** — Schichtentrennung, keine zweiten Engines, Tenant-Isolation.

## 7.2 Ausführung

- Lokal und in CI (`.github/workflows`).
- Ein Gate darf nicht als grün gemeldet werden, wenn es nicht lief.
- Tatsächliche Befehle + Ausgaben gehören in den Abschlussbericht.

## 7.3 Architekturtests (Beispiele)

- Keine Fachlogik in `route.ts` (nur Orchestrierung).
- Alle Routen nutzen `withApiContext` + Envelope.
- Keine zweite Runtime/Engine/Queue/Finance.
- Tenant-Filter in allen Repository-Queries.

## 7.4 Performance-Gates

- GET p95 < 300 ms, Mutation p95 < 800 ms (siehe Teil 8/Performance).
- Memory-Lookups indexiert auf `tenantId`.

## 7.5 Verbot

Erfundene grüne Ergebnisse sind untersagt. Blocker und tatsächlich
ausgeführte Befehle werden dokumentiert.

## 7.6 CI-Pipeline (Zielbild)

```
install → prisma generate → typecheck → lint → unit → build → e2e → report
```

---

# Band 10 – Masterprompt 10.0, Teil 8: Tests & Abschlussbericht

## 8.1 Unit-Tests (Vitest)

Bestehend (aus Band 10.1-Scaffold):

- `src/lib/api/response.test.ts` — Envelope-Erzeugung, Status-Mapping.
- `src/lib/api/validate.test.ts` — `parseBody`, `uuidSchema`, Fehlerfälle.
- `src/lib/api/route-context.test.ts` — `withApiContext`, Tenant/Permission.

Abzudeckende Pfade:

- Erfolgs- und Fehlerpfade jedes Helpers.
- Tenant-Isolation im Kontext-Wrapper.
- Idempotenz-Helper (Neu vs. gecacht).

## 8.2 Integrationstests

- Kritische Routen gegen echte/Test-DB.
- Cross-Tenant-Zugriff → `403`/`404`.
- Idempotenz: doppelter POST mit Key → identisches Result.

## 8.3 Security-Tests

- Token-Fehler → `401`.
- Fehlendes Permission → `403`.
- Body-Tenant-Manipulation wird ignoriert (serverseitig überschrieben).

## 8.4 Performance-Tests

- Envelope-Serialisierung < 1 ms (typische Payload).
- Zod-Schema-Cache wirksam (kein Recompile pro Request).

## 8.5 Abschlussbericht-Struktur

Jeder Masterprompt liefert einen Abschlussbericht:

1. Ausgangszustand
2. Gap-Analyse (Soll vs. Ist)
3. erstellte Dateien
4. geänderte Dateien
5. Datenbankänderungen
6. APIs und Events
7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse
9. offene Blocker
10. technische Schulden
11. Empfehlung für den nächsten Schritt

## 8.6 Definition of Done (Band 10)

- Alle APIs folgen dem Standard (Envelope, Zod, `withApiContext`).
- OpenAPI aktualisiert.
- Tests grün (Unit + Integration + Security).
- Audit integriert für kritische Änderungen.
- Keine Parallelstrukturen.
- EXECUTION_STATE.md aktualisiert.

## 8.7 Verbot

Masterprompt gilt nicht als abgeschlossen bei:

- nur Platzhalter
- fehlende Tests
- fehlgeschlagene Gates
- nicht geprüfte Migrationen
- ungeklärter Tenant-Isolation
- fehlenden Kernanforderungen

---

