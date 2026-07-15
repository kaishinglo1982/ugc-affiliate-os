# CarryOS Universe – Band 17
# Masterprompt: SHK Office Enterprise (VOLLSTÄNDIG)

> Band: 17 | Masterprompt: 17.0 | Status: PLANNED | Gruppe: Core Intelligence
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork erlaubt

> Hinweis: Planungs-Masterprompt. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Bestehende Systeme werden erweitert, nicht dupliziert. Keine zweite Runtime/Engine/Queue/Finance.

- Thema: SHK Office Enterprise
- Gruppe: Core Intelligence
- Ist-Zustand: kein eigener Code in diesem Repository; baut auf CarryOS Core auf.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- Thema: SHK Office Enterprise
- Gruppe: Core Intelligence
- Ist-Zustand: kein eigener Code in diesem Repository; baut auf CarryOS Core auf.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- Thema: SHK Office Enterprise
- Gruppe: Core Intelligence
- Ist-Zustand: kein eigener Code in diesem Repository; baut auf CarryOS Core auf.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- Thema: SHK Office Enterprise
- Gruppe: Core Intelligence
- Ist-Zustand: kein eigener Code in diesem Repository; baut auf CarryOS Core auf.

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Thema: SHK Office Enterprise
- Gruppe: Core Intelligence
- Ist-Zustand: kein eigener Code in diesem Repository; baut auf CarryOS Core auf.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- Thema: SHK Office Enterprise
- Gruppe: Core Intelligence
- Ist-Zustand: kein eigener Code in diesem Repository; baut auf CarryOS Core auf.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- Thema: SHK Office Enterprise
- Gruppe: Core Intelligence
- Ist-Zustand: kein eigener Code in diesem Repository; baut auf CarryOS Core auf.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Thema: SHK Office Enterprise
- Gruppe: Core Intelligence
- Ist-Zustand: kein eigener Code in diesem Repository; baut auf CarryOS Core auf.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Thema: SHK Office Enterprise
- Gruppe: Core Intelligence
- Ist-Zustand: kein eigener Code in diesem Repository; baut auf CarryOS Core auf.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Thema: SHK Office Enterprise
- Gruppe: Core Intelligence
- Ist-Zustand: kein eigener Code in diesem Repository; baut auf CarryOS Core auf.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
