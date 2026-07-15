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
