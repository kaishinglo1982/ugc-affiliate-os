<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# CarryOS – Project Instructions (Agent Swarm + Codex)

## Codex-Steuerung

Codex wird verbindlich angewiesen, vor jeder Roadmap-Aufgabe diese
Lesereihenfolge zu verwenden:

1. `AGENTS.md`
2. `CODEX.md`
3. `docs/roadmaps/BANDS_10_16_ROADMAP.md`
4. `docs/roadmaps/ROADMAP_INDEX.md`
5. `docs/roadmaps/EXECUTION_STATE.md`
6. `docs/bands/<betroffener-band>/`
7. Repository-Code und Tests

`CODEX.md` ist die zentrale Roadmap-, Architektur- und Ausführungsanleitung
für Codex und definiert die Arbeitsregeln, Abhängigkeiten und Quality Gates.

## Projektziel

CarryOS ist eine modulare, mandantenfähige Enterprise-Plattform mit:

- CarryOS Core
- Agentic Operating System
- CarryBrain
- Content Factory
- Growth OS
- Finance OS
- Plugin- und Branchenplattform
- SHK Office als erster vollständiger Branchenedition

## Verbindliche Quellen

Lies vor jeder Implementierungsaufgabe:

1. `docs/roadmaps/ROADMAP_INDEX.md`
2. `docs/roadmaps/EXECUTION_STATE.md`
3. den im Auftrag genannten Band unter `docs/bands/`
4. vorhandene Architektur- und Abschlussberichte des betroffenen Moduls
5. vorhandenen Code und bestehende Tests

`docs/roadmaps/BANDS_10_16_ROADMAP.md` ist die übergeordnete
Abhängigkeits- und Zielroadmap.

## Arbeitsregel

Die Roadmap beschreibt den Soll-Zustand.

Der tatsächliche Repository-Code ist der Ist-Zustand.

Führe vor jeder Implementierung eine Gap-Analyse durch:

1. vorhandene Implementierung suchen
2. bestehende Modelle, Services und APIs identifizieren
3. Soll gegen Ist vergleichen
4. nur echte Lücken umsetzen
5. keine Parallelstrukturen erzeugen

## Abhängigkeitsreihenfolge

1. Band 10 – API Governance
2. Band 11 – Agentic Operating System
3. Band 12 – Autonomous Content Factory
4. Band 13 – Growth und Publishing
5. Band 14 – Business und Finance
6. Band 15 – Enterprise Infrastructure
7. Band 16 – Industry Solution Factory
8. Band 17 – SHK Office Enterprise Edition

Bearbeite keinen abhängigen Abschnitt, bevor dessen Voraussetzungen
vorhanden oder ausdrücklich als externer Blocker dokumentiert sind.

## Architekturregeln

- vorhandene Systeme erweitern, nicht duplizieren
- CarryOS Core bleibt branchenneutral
- Fachlogik gehört in Fachmodule
- keine zweite Authentifizierung
- keine zweite Agent Runtime
- keine zweite Workflow Engine
- keine zweite EventBus- oder Queue-Architektur
- keine zweite Finance Engine
- keine ungeprüften Direktzugriffe auf externe Tools
- Tenant- und Workspace-Isolation durchgehend erzwingen

## Coding-Regeln

- TypeScript Strict Mode
- niemals `any`
- Zod für externe Eingaben
- serverseitige Autorisierung
- keine Fachlogik in Route Handlern
- bestehende Repository- und Service-Schichten verwenden
- idempotente Write-Prozesse
- versionierte Events
- Audit für kritische Änderungen
- keine Secrets in Code, Logs, Prompts oder Dokumentation

## Free-First-Regel

Bei externen KI- und Providerdiensten gilt:

1. vorhandene eigene Infrastruktur
2. kostenlose API
3. Free Tier
4. bereits bezahltes Kontingent
5. günstigster erlaubter Provider
6. Premium-Provider nur nach Freigabe

Free-First darf Sicherheit, Qualität oder Plattformrichtlinien nicht umgehen.

## Umsetzung eines Masterprompts

Bei jedem Masterprompt:

1. Repository analysieren
2. Gap-Bericht erstellen
3. Abhängigkeiten prüfen
4. Implementierungsplan erstellen
5. kleine, nachvollziehbare Änderungen durchführen
6. Tests ergänzen
7. relevante Quality Gates ausführen
8. Dokumentation aktualisieren
9. `EXECUTION_STATE.md` aktualisieren
10. Abschlussbericht erzeugen

## Pflichtprüfungen

Führe die im Repository vorhandenen passenden Befehle aus für:

- Lint
- Typecheck
- Unit-Tests
- Integrationstests
- Architekturtests
- Security-Tests

Erfinde keine grünen Ergebnisse. Dokumentiere Blocker und tatsächlich
ausgeführte Befehle.

## Git-Regeln

- arbeite auf einem Feature-Branch
- ein Masterprompt oder klarer Teilschritt pro Commit
- keine fremden Änderungen überschreiben
- keine großen unzusammenhängenden Commits
- Commit-Nachrichten nennen Band und Masterprompt
- erst nach erfolgreichen Gates als abgeschlossen markieren

## Abschlussbericht

Jeder abgeschlossene Masterprompt benötigt:

1. Ausgangszustand
2. Gap-Analyse
3. erstellte Dateien
4. geänderte Dateien
5. Datenbankänderungen
6. APIs und Events
7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse
9. offene Blocker
10. technische Schulden
11. Empfehlung für den nächsten Schritt

## Verbot

Markiere keinen Band oder Masterprompt als abgeschlossen, wenn:

- nur Platzhalter existieren
- Tests fehlen
- Pflicht-Gates fehlschlagen
- Migrationen nicht geprüft wurden
- Tenant-Isolation ungeklärt ist
- dokumentierte Kernanforderungen fehlen
