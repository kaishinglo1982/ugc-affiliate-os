# CarryOS Universe – Band 12
# Masterprompt: Autonomous Content Factory (VOLLSTÄNDIG)

> Band: 12
> Masterprompt: 12.0 (vollständig, konsolidiert)
> Status: PLANNED
> Abhängigkeit: Band 11 (Agent Runtime), Band 10 (API)
> Ziel: Content-Generierung, Varianten, Experimente, Freigaben — idempotent und versioniert.

---

## Kapitel 1 – Architektur

Basis: `src/lib/content-intelligence`. Agenten aus Band 11 führen
Generierung aus. Bestehende Experiment- und Approval-Routen werden erweitert,
nicht dupliziert. Keine zweite Content-Engine.

---

## Kapitel 2 – Datenmodelle

- `ContentBrief` (tenantId, topic, requirements)
- `ContentVariant` (briefId, version, payload, status)
- `Experiment` (briefId, variants[], metric)
- `Approval` (variantId, approverId, decision)

---

## Kapitel 3 – APIs

- `POST /api/v1/content/briefs`
- `POST /api/v1/content/variants` (nutzt Agent)
- `POST /api/v1/experiments` (nutzt bestehende `experiments/*`)
- `POST /api/v1/approvals` (nutzt bestehende `approvals/*`)

Alle nutzen Band-10-Envelope + `withApiContext`.

---

## Kapitel 4 – Events

- `content.brief.created.v1`
- `content.variant.generated.v1`
- `experiment.started.v1`
- `approval.decision.v1`

---

## Kapitel 5 – Workflows

Brief → Variant-Generierung (Agent) → Experiment → Analyse → Approval →
Publish-Vorbereitung (Band 13). Idempotente Schritte via ExecutionKey.

---

## Kapitel 6 – Agenten

Content-Generation-Agent registered in Band 11 Runtime. Capability:
`generateVariant(brief) → variant`.

---

## Kapitel 7 – UI

Briefs-, Varianten-, Experiment-Dashboards. Freigabe-Workflow-UI.

---

## Kapitel 8 – Tests

- Unit: Variant-Generierung, Experiment-Logik
- Integration: End-to-End Brief→Variant→Experiment
- Security: Tenant-Isolation der Briefs/Varianten

---

## Kapitel 9 – Security

- Tenant-Isolation über alle Content-Entitäten
- Approval auditierbar
- Keine ungeprüften externen Tool-Zugriffe

---

## Kapitel 10 – Performance

- Generierung asynchron (Agent/Queue)
- Varianten-Versionierung ohne Vollkopien wo möglich

---

## Quality Gates

1. TypeScript Strict, keine `any`.
2. Lint grün. 3. Typecheck grün. 4. Unit-Tests grün.
5. Integrationstests grün. 6. Architekturtests: keine zweite Content-Engine.

---

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
