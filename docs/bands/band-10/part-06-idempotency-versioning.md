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
