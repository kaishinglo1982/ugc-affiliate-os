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
