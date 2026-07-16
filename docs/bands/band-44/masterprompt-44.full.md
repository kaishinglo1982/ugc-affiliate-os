# CarryOS Universe – Band 44
# Masterprompt: Angebotsmanagement (VOLLSTÄNDIG)

> Band: 44 | Masterprompt: 44.0 | Status: PLANNED | Gruppe: Commerce & Sales
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork erlaubt

> Hinweis: Fachmodul baut ohne Fork auf CarryOS Core auf. Erzeugt Angebote aus Pipeline (Band 42); Preis/Rechnung über Band 14.

## Kapitel 1 – Architektur

- Angebotsmodul als Package `src/modules/commerce/quotes/`; keine eigene Runtime, DB oder Queue.
- Angebot, Positionen und Versionen sind fachliche Aggregate über Core-Repository mit `tenantId`-Filter.
- Preisberechnung nutzt Band-14-Preisregeln; dieses Modul speichert nur verschlüsselte Gesamtbeträge.
- Nutzt Band-11-Agenten für Angebots-Generierung aus Deal-Daten.

## Kapitel 2 – Datenmodelle

- Entität `Quote` (id, tenantId, dealId, accountId, version, status, validUntil, totalNetEnc, totalGrossEnc, currency) – versioniert, Beträge verschlüsselt.
- Entität `QuoteLineItem` (id, tenantId, quoteId, productRef, quantity, unitPriceEnc, discountPct, lineTotalEnc).
- Entität `QuoteTemplate` (id, tenantId, name, layoutJson, termsJson) – Briefing/Vorlage.
- Entität `QuoteAcceptance` (id, tenantId, quoteId, signedAt, signerHash, channel) – Signatur-Nachweis.
- Alle Modelle zwingend `tenantId`; Schema nur im Commerce-Namespace.

## Kapitel 3 – APIs

- `POST /api/v1/commerce/quotes` – Angebot aus Deal erzeugen; Zod `quoteCreateSchema`, Envelope.
- `GET /api/v1/commerce/quotes/:id` – Angebot mit Positionen, paginiert, tenant-isoliert.
- `POST /api/v1/commerce/quotes/:id/version` – neue Version; triggert `quote.version.created.v1`.
- `POST /api/v1/commerce/quotes/:id/accept` – Annahme; `quote.accepted.v1` → Band 42/Band 14.
- `GET /api/v1/commerce/quotes?status=` – Liste gefiltert nach Status.

## Kapitel 4 – Events

- `quote.created.v1` – nach Erzeugung; referenziert `dealId`.
- `quote.version.created.v1` – bei Neuversionierung; alte Version bleibt immutable.
- `quote.accepted.v1` – bei Annahme; konsumiert von Band 42 (Deal→Won) und Band 14 (Rechnung).
- `quote.expired.v1` – bei `validUntil` Überschreitung; für Agent-Reminder.
- Events versioniert über Outbox; Beträge nur verschlüsselt im Payload.

## Kapitel 5 – Workflows

- Angebotserzeugung: ApiContext → Zod → requireApiPermission(quote:write) → QuoteService.create (ruft Band-14-Preisregel) → Repository → Outbox → Envelope.
- Versionierung: Service → Kopie + Inkrement → immutable old → Event; idempotent via Version-Key.
- Annahme: Service → `QuoteAcceptance` → `quote.accepted.v1`; keine Logik im Handler.

## Kapitel 6 – Agenten

- `QuoteGenerationAgent`: füllt Positionen aus Deal und Produktkatalog, nutzt Band-14-Preisregel.
- `QuoteExpiryAgent`: erkennt abgelaufene Angebote und erzeugt `quote.expired.v1`.
- `QuoteUpsellAgent`: schlägt Zusatzpositionen auf Basis von Account-Profil vor.
- Registrierung in Band-11-Runtime; keine eigene LLM-Infrastruktur.

## Kapitel 7 – UI

- `QuoteEditor` zeigt Positionen und Gesamtbeträge (server-decrypted), gefiltert nach `tenantId`.
- `QuoteList` mit Status-Filter und Version-Dropdown; schreibt nur via APIs.
- `QuotePreview` rendert `QuoteTemplate` als PDF-Vorschau; reine Darstellung.
- Komponenten unter `src/modules/commerce/quotes/ui/`, nur v1-APIs.

## Kapitel 8 – Tests

- Unit (Vitest): Versionierungs-Logik, Rabatt-Berechnung, Ablauf-Erkennung.
- Integration: Angebot → Annahme → Event-Kette zu Band 42/14; Tenant-Isolation verifiziert.
- Security: Scope-Verweigerung, verschlüsselte Beträge, Cross-Tenant blockiert.
- Fehlerpfade: ungültige Deal-Ref, abgelaufenes Angebot, doppelte Annahme.

## Kapitel 9 – Security

- Auth über Core (keine zweite); Autorisierung via `requireApiPermission` (`quote:read`, `quote:write`).
- Tenant-Isolation durchgehend; Geldbeträge verschlüsselt, nie in Logs/Prompts.
- Audit über Band-10 für Versionierung und Annahme; Signatur-Hash wird protokolliert.

## Kapitel 10 – Performance

- Indizes auf `(tenantId, dealId)`, `(tenantId, status, validUntil)`, `(tenantId, quoteId)`.
- Versionen immutable cached; List-Queries mit Cursor, p95 < 200 ms.
- PDF-Generierung asynchron; keine Blocking-Calls in Route-Handlern.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines, keine Core-Fork.
7. Tenant-Isolation-Test grün. 8. Encryption-Verifizierung Geldbeträge.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
