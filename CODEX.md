# CarryOS – Codex Project Instructions

This file is the central roadmap, architecture, and execution guide for Codex.
It is referenced from `AGENTS.md` and must be read before any roadmap task.

## Verbindliche Lesereihenfolge vor jeder Roadmap-Aufgabe

1. `AGENTS.md` (Root-Regeln, Architektur- und Coding-Regeln)
2. `CODEX.md` (diese Datei)
3. `docs/roadmaps/BANDS_10_16_ROADMAP.md` (übergeordnete Ziel-/Abhängigkeitsroadmap)
4. `docs/roadmaps/CHAPTERS_1_70_ROADMAP.md` (70 Kernkapitel der Core-Plattform)
5. `docs/roadmaps/BANDS_1_100_OVERVIEW.md` (Gesamtübersicht aller 100 Bände)
6. `docs/roadmaps/ROADMAP_INDEX.md` (aktiver Band/Masterprompt)
7. `docs/roadmaps/EXECUTION_STATE.md` (live Status, Voraussetzungen, Blocker)
8. `docs/bands/<betroffener-band>/` (Masterprompt + Acceptance des Bandes)
9. Repository-Code und bestehende Tests (Ist-Zustand)

Codex muss aus dem Repository-Root gestartet werden, damit diese
Anweisungskette aufgebaut wird. Die Summe automatisch geladener
Projektanweisungen ist begrenzt; lange Masterprompts gehören nach
`docs/bands/` und werden bei der jeweiligen Aufgabe explizit gelesen.

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

## Abhängigkeitsreihenfolge (Bänder)

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

## Arbeitsregel (Soll vs. Ist)

Die Roadmap beschreibt den Soll-Zustand. Der tatsächliche Repository-Code ist
der Ist-Zustand. Führe vor jeder Implementierung eine Gap-Analyse durch:

1. vorhandene Implementierung suchen
2. bestehende Modelle, Services und APIs identifizieren
3. Soll gegen Ist vergleichen
4. nur echte Lücken umsetzen
5. keine Parallelstrukturen erzeugen

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

## Pflichtprüfungen (Quality Gates)

Führe die im Repository vorhandenen passenden Befehle aus für:

- Lint
- Typecheck
- Unit-Tests
- Integrationstests
- Architekturtests
- Security-Tests

Erfinde keine grünen Ergebnisse. Dokumentiere Blocker und tatsächlich
ausgeführte Befehle.

## Start-Prüfauftrag (Verbindung testen)

Lies zuerst `AGENTS.md`, `CODEX.md` und
`docs/roadmaps/BANDS_10_16_ROADMAP.md`.

Nimm zunächst keine Codeänderungen vor.

Prüfe, welche vollständigen Band- und Masterprompt-Dateien bereits
unter `docs/bands/` vorhanden sind.

Erstelle anschließend eine Gap-Matrix für Band 10 bis Band 16 und
nenne die nächste sicher ausführbare Aufgabe.

## Git-Regeln

- arbeite auf einem Feature-Branch
- ein Masterprompt oder klarer Teilschritt pro Commit
- keine fremden Änderungen überschreiben
- Commit-Nachrichten nennen Band und Masterprompt
- erst nach erfolgreichen Gates als abgeschlossen markieren
