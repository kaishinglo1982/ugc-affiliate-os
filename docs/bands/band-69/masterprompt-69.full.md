# CarryOS Universe – Band 69
# Masterprompt: Platform Operations (VOLLSTÄNDIG)

> Band: 69 | Masterprompt: 69.0 | Status: PLANNED | Gruppe: Platform
> Abhängigkeit: Band 10–16 (Core), Band 15 (Enterprise Infrastructure), keine Core-Fork

## Kapitel 1 – Architektur

- Platform Operations ist der betriebliche Steuerungs-Layer (Ops Console) für Deployment, Health, Scaling und Incident-Management – gebaut auf Band 15 Infrastructure-Primitives, keine eigene Ops-Engine.
- Ops-Services konsumieren Telemetrie aus Band 77/78 (Monitoring/Observability) und steuern Band 15 Ressourcen deklarativ.
- Multi-Tenant-Ops: Operationen sind tenant-scoped; globale Ops nur für Platform-Admins mit separater Permission.
- Automatisierung (Auto-Remediation) läuft über Band 9 Workflows, nicht über ad-hoc-Skripte.

## Kapitel 2 – Datenmodelle

- `OpsDeployment`: deploymentId, tenantId|null (null=global), target, version, status, startedBy.
- `OpsIncident`: incidentId, tenantId|null, severity, status, assignedTo, timeline[] (immutable).
- `OpsHealthCheck`: resourceId, tenantId|null, metric, status, lastCheckedAt.
- `OpsRunbook`: runbookId, trigger, workflowRef (Band 9), ownerRole.

## Kapitel 3 – APIs

- `GET /api/v1/ops/health` – aggregierte Health (tenant-scoped, Band-10-Envelope).
- `POST /api/v1/ops/deployments` – Deployment triggern (Platform-Admin-Permission).
- `POST /api/v1/ops/incidents` – Incident öffnen/eskalieren.
- `POST /api/v1/ops/runbooks/:id/execute` – Auto-Remediation via Band 9.

## Kapitel 4 – Events

- `ops.deployment_started.v1`, `ops.deployment_completed.v1`, `ops.incident_opened.v1`, `ops.incident_resolved.v1`, `ops.runbook_executed.v1`.
- Health-Events aggregieren aus Band 78; Deployment-Events versioniert für Rollback-Tracing.
- Alle Events mit `tenantId|null`, `deploymentId|incidentId`, `actorId`; schema-versioniert.

## Kapitel 5 – Workflows

- Deploy-Flow: Version-Pin → PreCheck (Band 15) → Band 9 Deploy-Workflow → Health-Gate → ExecutionKey → COMPLETED/ROLLED_BACK.
- Incident-Flow: Detect/Open → Severity → Runbook-Match → Auto/Manual-Remediation → Resolve → PostMortem.
- Scaling-Flow: Metric-Threshold (Band 78) → Band 9 Scale-Workflow → Band 15 Ressource-Adjust → Verify.

## Kapitel 6 – Agenten

- `OpsSupervisorAgent` (Band 11): korreliert Alerts, schlägt Runbooks vor, triggert Auto-Remediation.
- `DeploymentAgent`: führt deklarative Deploy-Workflows aus, überwacht Health-Gates.
- `IncidentTriageAgent`: klassifiziert Severity, routet an zuständige Rolle.

## Kapitel 7 – UI

- Ops Console: Global/Tenant-Health-Dashboard, Deploy-Status, Incident-Board (Kanban).
- Runbook-Library: Trigger-Übersicht, Execute-Button, Ausführungs-History.
- Deployment-Timeline: Versionen, Rollback-Controls, Health-Gate-Ergebnisse.

## Kapitel 8 – Tests

- Vitest-Unit: Severity-Classifier, Runbook-Matcher, Health-Gate-Logic, Deployment-State-Machine.
- Integration: Deploy→HealthGate→Rollback Roundtrip; Tenant-Ops nicht in fremdem Tenant sichtbar.
- Security-Test: Nicht-Admin triggert Global-Deploy → 403 + Audit-Alert.

## Kapitel 9 – Security

- Platform-Admin-Permission strikt getrennt von Tenant-Permission; globale Ops nur mit MFA-Role.
- Runbook-Ausführung auditiert (Band 76); keine direkten Shell-Zugriffe aus Ops-UI.
- Secrets niemals in Deploy-Configs; Vault-Refs (siehe Band 68) werden injiziert.

## Kapitel 10 – Performance

- Health-Aggregation p95 < 500ms über gecachte Metriken (Band 78); Deploy-Trigger < 200ms.
- Incident-Board Echtzeit via Event-Stream; Indizes auf (tenantId|null, status, severity).
- Auto-Remediation asynchron via Band 9, kein Blocking im Ops-Request-Pfad.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweite Ops/Infra-Engine.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
