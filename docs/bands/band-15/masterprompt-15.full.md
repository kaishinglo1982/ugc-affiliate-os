# CarryOS Universe – Band 15
# Masterprompt: Enterprise Infrastructure (VOLLSTÄNDIG)

> Band: 15 | Masterprompt: 15.0 | Status: DOCUMENTED | Gruppe: Core Intelligence
> Abhängigkeit: Band 10 (API Governance)

> Hinweis: Dieser Band hat Code-Bezug im Repository; Masterprompt verweist auf bestehende Module.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Bestehende Systeme werden erweitert, nicht dupliziert. Keine zweite Runtime/Engine/Queue/Finance.

- Thema: Enterprise Infrastructure
- Gruppe: Core Intelligence
- Ist-Zustand: bestehende Artefakte in `src/` werden erweitert (Gap-Analyse erforderlich).

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- Thema: Enterprise Infrastructure
- Gruppe: Core Intelligence
- Ist-Zustand: bestehende Artefakte in `src/` werden erweitert (Gap-Analyse erforderlich).

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- Thema: Enterprise Infrastructure
- Gruppe: Core Intelligence
- Ist-Zustand: bestehende Artefakte in `src/` werden erweitert (Gap-Analyse erforderlich).

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- Thema: Enterprise Infrastructure
- Gruppe: Core Intelligence
- Ist-Zustand: bestehende Artefakte in `src/` werden erweitert (Gap-Analyse erforderlich).

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Thema: Enterprise Infrastructure
- Gruppe: Core Intelligence
- Ist-Zustand: bestehende Artefakte in `src/` werden erweitert (Gap-Analyse erforderlich).

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- Thema: Enterprise Infrastructure
- Gruppe: Core Intelligence
- Ist-Zustand: bestehende Artefakte in `src/` werden erweitert (Gap-Analyse erforderlich).

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- Thema: Enterprise Infrastructure
- Gruppe: Core Intelligence
- Ist-Zustand: bestehende Artefakte in `src/` werden erweitert (Gap-Analyse erforderlich).

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Thema: Enterprise Infrastructure
- Gruppe: Core Intelligence
- Ist-Zustand: bestehende Artefakte in `src/` werden erweitert (Gap-Analyse erforderlich).

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Thema: Enterprise Infrastructure
- Gruppe: Core Intelligence
- Ist-Zustand: bestehende Artefakte in `src/` werden erweitert (Gap-Analyse erforderlich).

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Thema: Enterprise Infrastructure
- Gruppe: Core Intelligence
- Ist-Zustand: bestehende Artefakte in `src/` werden erweitert (Gap-Analyse erforderlich).

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
