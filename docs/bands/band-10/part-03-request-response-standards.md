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
