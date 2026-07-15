# CarryOS Universe – Band 01
# Masterprompt: Vision & Produktstrategie (VOLLSTÄNDIG)

> Band: 1 | Masterprompt: 1.0 | Status: PLANNED | Gruppe: Foundation
> Abhängigkeit: keine (Foundation)

> Hinweis: Planungs-Masterprompt. Definiert das Zielbild und die Produktlinie für das gesamte CarryOS Universe. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork.

## Kapitel 1 – Architektur

- Zielbild: modular-branchenneutrale Enterprise-Plattform (CarryOS Core) + aufsetzende Brancheneditionen (Band 17+), getrennt durch klare Domänengrenzen, nicht durch Code-Duplikate.
- CarryOS Core bleibt branchenneutral; alle Fachlogik (SHK, Agentic OS, Finance) liegt in Fachmodulen, die Core erweitern – kein eigener Fork, keine zweite Architekturlinie.
- Produktstrategie ordnet jede Edition einem Band zu (siehe `BANDS_1_100_OVERVIEW.md`); Roadmap-Reihenfolge ist verbindlich (Foundation 1–10 vor Core Intelligence 11+).
- Entscheidungsprinzip Free-First: externe KI/Provider nur über bestehende eigene Infrastruktur → kostenlose API → Free Tier → bezahltes Kontingent → günstigster Provider, niemals Premium ohne Freigabe.
- Strategie-Dokumentation zwingend in `docs/roadmaps/`, je Band ein `docs/bands/band-NN/` Verzeichnis; Abweichungen werden als Architekturentscheidung (ADR) festgehalten.

## Kapitel 2 – Datenmodelle

- Vision-Artefakte selbst sind dokumentenbasiert (`docs/roadmaps/*.md`); keine produktiven Prisma-Modelle in diesem Planungsband.
- Produkt-Metadaten (Editionskatalog, Band-Index) werden als referenzierende Listen gepflegt, nicht als operative Tabellen.
- Wenn später Editionen als Tenants modelliert werden: zwingend `tenantId` auf jeder Entität, niemals mandantenübergreifende Queries ohne Filter.
- Roadmap-Abhängigkeiten werden als gerichteter Graph dokumentiert (Voraussetzung-Band → abhängiges Band), Basis für Gap-Analysen.
- Strategische KPIs (Editionsdeckung, Band-Abschluss-Quote) nur lesend aus operativen Daten abgeleitet, keine Schreibpfade aus Vision-Layer.

## Kapitel 3 – APIs

- Keine operativen Endpunkte in Band 1; strategische Verträge werden als Dokumentation im Band-10-Envelope-Standard beschrieben (Version im Pfad, Zod-Schemas, Envelope-Antwort).
- Produkt-Exposition (Editionskatalog, Roadmap-Status) folgt später dem API-Governance-Standard aus Band 10, sobald ein Lese-Endpoint benötigt wird.
- Alle späteren Edition-APIs erben das `withApiContext`-Muster und die Envelope-Struktur aus Band 10, keine eigenen Response-Formate.
- Versionierung: `/v1/...` Pfadsegment verpflichtend, Breaking Changes nur mit neuer Versionsnummer.
- Strategische APIs dokumentieren explizit Tenant-Scope und erlaubte Rollen (requireApiPermission).

## Kapitel 4 – Events

- Vision-Layer emitiert keine Produktiv-Events; Roadmap-Statusänderungen sind reine Dokumentationsänderungen.
- Wenn Edition-Launch als Event modelliert wird: versioniertes Event `edition.launched.v1` über bestehende Outbox/Queue, niemals direkter Emit außerhalb der Event-Infrastruktur.
- Event-Namenkonvention: `domain.verb.v1`, payload streng via Zod validiert, tenantId im Envelope-Header.
- Keine neuen Event-Bus-Implementierungen; bestehender CarryOS EventBus wird genutzt.
- Strategische Events dienen der Observability (Roadmap-Fortschritt), nicht der Geschäftslogik.

## Kapitel 5 – Workflows

- Strategie-Review-Prozess: Vision-Lesung → Roadmap-Gap-Analyse → Band-Priorisierung → Masterprompt-Erstellung → Quality Gates → Abschlussbericht.
- Keine ausführbare Workflow-Engine in Band 1; der Prozess wird als Vorgabe für die Swarm/Codex-Ausführung dokumentiert.
- Idempotenz-Prinzip bereits hier verankern: jeder Masterprompt ist ein abgeschlossener, wiederholbar ausführbarer Schritt (ExecutionKey-Gedanke aus Band 9/10).
- Band-Reihenfolge erzwingt Abhängigkeitskontrolle: kein abhängiger Band startet vor Abschluss seiner Voraussetzungen.
- Review-Gate: kein Band als "abgeschlossen" markieren bei nur Platzhaltern, fehlenden Tests oder offener Tenant-Isolation.

## Kapitel 6 – Agenten

- Strategie-Agenten (Planung, Roadmap-Tracking) sind reine Dokumentationsrollen, keine registrierten Runtime-Agenten aus Band 11.
- Verantwortung: Gap-Bericht je Masterprompt, Abhängigkeitsprüfung, Implementierungsplan – ausgeführt durch Swarm/Codex unter CarryOS Agentic OS (Band 11).
- Keine eigenständige Agent-Runtime in Band 1; Orchestrierung erfolgt zentral über Band 11, sobald vorhanden.
- Agenten dürfen nur über geprüfte Tools auf Repository zugreifen, keine ungeprüften Direktzugriffe.
- Strategische Rollen werden in `EXECUTION_STATE.md` nachgehalten (Wer, Welcher Band, Status).

## Kapitel 7 – UI

- Keine produktive UI in Band 1; Roadmap-Darstellung ist Markdown in `docs/roadmaps/`.
- Optional: späteres Roadmap-Dashboard liest ausschließlich aus dokumentierten Statusdaten, keine Fachlogik in Client-Komponenten.
- UI-Komponenten (falls später) nutzen bestehende Design-Tokens/Primitives aus CarryOS Core, keine eigenen Style-Systeme.
- Tenant-spezifische Sichtbarkeit von Editionen wird serverseitig gefiltert, nie im Client entschieden.
- Strategie-Visualisierungen bleiben schreibgeschützt (read-only), keine Mutationspfade aus Vision-UI.

## Kapitel 8 – Tests

- Planungsband hat keine Code-Tests; Verifikation erfolgt über Dokumentationskonsistenz (Band-Index ↔ Roadmap ↔ Masterprompts).
- Regel: jeder Eintrag in `BANDS_1_100_OVERVIEW.md` muss ein korrespondierendes `masterprompt-XX.full.md` besitzen (Vollständigkeits-Check).
- Abhängigkeitsgraph-Test: keine zyklischen Abhängigkeiten zwischen Bändern, Topologische Ordnung muss existieren.
- Wenn später Strategie-API: Unit (Vitest) + Integration + Security (Tenant-Isolation) wie in Band 10 definiert.
- Review-Checkliste als Ersatz für automatisierte Gates: Platzh Alter-Check, Tenant-Scope-Check, ADR-Referenz-Check.

## Kapitel 9 – Security

- Keine Secrets, keine Zugangsdaten in Strategiedokumenten; Verstöße gegen Free-First/Security-Regeln werden nicht dokumentiert.
- Dokumentationszugriff folgt CarryOS Authorization (requireApiPermission), sobald Roadmap-Daten über API exponiert werden.
- Tenant-Isolation gilt bereits auf Strategieebene: keine mandantenübergreifenden Roadmap-Inhalte ohne expliziten Scope.
- Keine zweite Authentifizierung für Strategie-Tools; bestehendes CarryOS Auth wird genutzt.
- Audit: strategische Architekturentscheidungen (ADRs) werden versioniert abgelegt, nachvollziehbar wer wann was entschieden hat.

## Kapitel 10 – Performance

- Strategiedokumente müssen schnell parsebar sein: flache Listen, keine tiefen Verschachtelungen, klare `Band: NN` Referenzen.
- Roadmap-Index bleibt als Single-Source-of-Truth klein; detaillierte Inhalte liegen in band-spezifischen Dateien (Lazy Loading by Reference).
- Keine performanzkritischen Pfade in Band 1; bei späterer Roadmap-API: Indizes auf tenantId, p95-Ziel < 200ms für Listenabfragen.
- Caching strategischer Listen clientseitig nur für read-only Inhalte, TTL kurz (Roadmap ändert sich selten, aber relevant).
- Dokumentations-Build (falls generiert) asynchron, blockiert keine Ausführung der Swarm/Codex-Pipeline.

## Quality Gates

1. TypeScript Strict, keine `any` (sobald Code existiert). 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Vollständigkeits-Check: jeder Band aus Overview hat Masterprompt. 8. Kein Band als done ohne Abschlussbericht.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
