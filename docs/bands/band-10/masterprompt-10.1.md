# Masterprompt 10.1 – API Governance Grundgerüst

## Ausgangslage

Die Plattform hat bereits zahlreiche `/api`-Routen (experiments, recommendations,
content-intelligence, agents). Diese nutzen teils inkonsistente Fehlerbehandlung
und Validierung. Es existiert keine zentrale API-Governance.

## Ziel

Schaffe ein wiederverwendbares API-Governance-Grundgerüst, das alle Routen
einheitlich nutzen können, ohne bestehende Fachlogik zu duplizieren.

## Aufgaben

1. Repository- und Gap-Analyse der bestehenden `/api`-Routen durchführen.
2. Einen zentralen API-Response-/Error-Envelope in `src/lib/api` anlegen
   (kein Parallelmodul zu bestehenden Hilfsfunktionen).
3. Einen Zod-basierten Validierungs-Helper für Request-Bodies bereitstellen.
4. Einen Autorisierungs-/Tenant-Isolation-Wrapper für Route Handler bereitstellen,
   damit Fachlogik in Services bleibt.
5. Die 12 bereits geänderten Routen (`agents.ts`, experiments, recommendations,
   content-intelligence) als erste Konsumenten prüfen/refaktorieren, sofern sie
   gegen die neuen Regeln verstoßen — ohne fremde Änderungen zu überschreiben.
6. Tests für das neue Gerüst ergänzen (Unit).
7. Quality Gates ausführen: lint, typecheck, unit tests.

## Architekturregeln

- Keine zweite Agent Runtime, Workflow Engine, EventBus- oder Finance Engine.
- Tenant- und Workspace-Isolation durchgehend erzwingen.
- Keine Fachlogik in Route Handlern.
- `niemals any`, Zod für externe Eingaben.

## Definition of Done

- Gerüst existiert und ist getestet.
- Dokumentation in `docs/bands/band-10/acceptance.md` erfüllt.
- EXECUTION_STATE.md aktualisiert.
- Abschlussbericht erzeugt.
