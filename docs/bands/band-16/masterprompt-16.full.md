# CarryOS Universe – Band 16
# Masterprompt: Industry Solution Factory (VOLLSTÄNDIG)

> Band: 16
> Masterprompt: 16.0 (vollständig, konsolidiert)
> Status: PLANNED
> Abhängigkeit: Band 15
> Ziel: Plugin-/Brancheneditions-Framework, modulare Factory, keine Forks des Cores.

---

## Kapitel 1 – Architektur

Branchenneutrale Core bleibt unverändert. Branchenlogik wird als
Edition-Plugin geladen. Bestehende Module erweitern. Keine Fork-Struktur.

---

## Kapitel 2 – Datenmodelle

- `Edition` (tenantId, key, version, config)
- `Plugin` (editionId, name, permissions[], hooks[])

---

## Kapitel 3 – APIs

- `POST /api/v1/editions` (Edition registrieren)
- `POST /api/v1/editions/:id/plugins`
- `GET /api/v1/editions/:id/config`

---

## Kapitel 4 – Events

- `edition.registered.v1`
- `plugin.installed.v1`

---

## Kapitel 5 – Workflows

Core → Edition-Factory → Plugin-Load (Hooks in bestehende Services) →
Tenant-Activation. Idempotent via ExecutionKey.

---

## Kapitel 6 – Agenten

Edition-spezifische Agenten als Plugins (Band 11 Runtime, erweiterbar).

---

## Kapitel 7 – UI

Edition-/Plugin-Marktplatz-UI (Gerüst; Marktplatz selbst siehe Universe-Phase).

---

## Kapitel 8 – Tests

- Unit: Factory-Loading, Hook-Resolution
- Integration: Edition Activation pro Tenant
- Security: Plugin-Permissions isoliert, kein Core-Zugriff außerhalb von Hooks

---

## Kapitel 9 – Security

- Plugin-Sandbox: nur deklarierte Permissions
- Tenant-Isolation auch in Edition-Kontext
- Keine ungeprüften externen Tool-Zugriffe durch Plugins

---

## Kapitel 10 – Performance

- Lazy-Loading von Edition-Plugins
- Hook-Resolution gecached pro Tenant

---

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün.
6. Architekturtests: kein Core-Fork, keine zweite Plugin-Engine.

---

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
