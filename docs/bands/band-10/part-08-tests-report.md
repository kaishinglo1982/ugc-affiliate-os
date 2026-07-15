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
