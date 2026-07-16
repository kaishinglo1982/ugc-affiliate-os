# CarryOS Universe – Band 73
# Masterprompt: Compliance (VOLLSTÄNDIG)

> Band: 73 | Masterprompt: 73.0 | Status: PLANNED | Gruppe: Enterprise
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

## Kapitel 1 – Architektur

Beschreibt die Compliance-Schichten. Erweitert bestehende Module statt Neuaufbau.

- Thema: Kontrollrahmen (Control Framework) das Fachmodule prüft und bewertet; baut auf `src/app/api/products/compliance` auf.
- Control-Engine in `src/lib/compliance/engine.ts`: mappt Modul-Aktionen auf Control-Objectives (tenant-aware).
- Integration mit Audit (`src/lib/audit`), Security (71), IAM (72) zur Beweis-Erhebung.
- Policy-as-Code: Compliance-Regeln als versionierte YAML/JSON, ausgewertet im Band-10-Request-Flow.
- Keine parallele Compliance-DB: Control-Ergebnisse referenzieren bestehende Audit-Logs.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `ControlObjective`: tenantId, framework (iso/soc2/dsgvo), code, description, severity.
- `ControlEvaluation`: tenantId, objectiveId, status (pass/fail/na), evidenceRef, evaluatedAt.
- `ComplianceReport`: tenantId, framework, period, score, generatedBy, signedAt.
- `ComplianceOverride`: tenantId, objectiveId, reason, approverId, expiresAt (nutzt `/override`).
- Alle Tabellen tenant-isoliert via `src/lib/auth/tenant.ts`.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `GET /api/v1/compliance/controls` – Control-Objectives je Framework lesen.
- `POST /api/v1/compliance/evaluate` – Evaluation triggern (Zod `EvalInput`), idempotent.
- `GET /api/v1/compliance/reports/:id` – Report abrufen.
- `POST /api/v1/compliance/override` – begründetes Override (Permission `compliance.admin`).
- Erweitert bestehende `/api/products/compliance/*`-Routes; kein Fork.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `compliance.control.evaluated.v1` – Einzel-Evaluation abgeschlossen.
- `compliance.report.generated.v1` – periodischer Report erzeugt.
- `compliance.override.created.v1` – Override angelegt (Audit-relevant).
- `compliance.drift.detected.v1` – Abweichung zu erwartetem Control-Status.
- Consumer: Audit Center (76), Observability (78).

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Evaluation: Job → `engine.ts` prüft Controls gegen Evidence → `ControlEvaluation` persistieren → Report.
- Override: Antrag → `compliance.admin`-Freigabe → `ComplianceOverride` → Event → Audit.
- Drift-Check: periodisch → Vergleich Soll/Ist → `compliance.drift.detected.v1`.
- Report-Signing: Erzeugung → digitale Signatur → `ComplianceReport.signedAt`.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `compliance-officer` Agent: überwacht Control-Drift, schlägt Remediation vor.
- `evidence-collector` Agent: sammelt Beweise aus Audit/Security/IAM für Controls.
- Registrierung in Band-11-Runtime; kein eigener Loop.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- `src/app/app/compliance` Cockpit: Control-Status-Matrix, Reports, Overrides.
- Report-Viewer mit Export (PDF/JSON); Signierung über Server-Action.
- Keine Compliance-Bewertungslogik im Client; Engine serverseitig.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: `engine.ts` Control-Auswertung, Override-Gültigkeit, Drift-Erkennung.
- Integration: Evaluation → Report mit korrektem Score.
- Security-Test: Cross-Tenant Control-/Report-Zugriff liefert 403.
- Negative: abgelaufenes Override wird nicht mehr akzeptiert.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- AuthN über bestehendes Session-System; AuthZ via `rbac.ts` mit `compliance.*`-Permissions.
- Tenant-Isolation via `tenant.ts` bei allen Compliance-Queries.
- Override-Gründe ohne Secrets; keine sensiblen Beweise im Klartext-Log.
- Reports signiert (tamper-evident); Manipulation erzeugt Audit-Alert.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `ControlEvaluation(tenantId, objectiveId, evaluatedAt)`, `ComplianceReport(tenantId, framework)`.
- Engine-Cache für Control-Objectives je Framework (TTL 300s); p95 Evaluation < 200ms.
- Batch-Evaluation asynchron via Queue; Reports nachts generiert.
- Report-Rendering gecached pro (tenantId, period).

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Security-Test: Cross-Tenant-Compliance-Block bestanden.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
