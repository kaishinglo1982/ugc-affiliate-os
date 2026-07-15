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
