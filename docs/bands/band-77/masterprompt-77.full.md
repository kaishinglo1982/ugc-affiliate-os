# CarryOS Universe – Band 77
# Masterprompt: Monitoring (VOLLSTÄNDIG)

> Band: 77 | Masterprompt: 77.0 | Status: PLANNED | Gruppe: Enterprise
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

## Kapitel 1 – Architektur

Beschreibt die Monitoring-Schichten. Erweitert bestehende Module statt Neuaufbau.

- Thema: Echtzeit-Überwachung von Infrastruktur, Applikation und Geschäftsmetriken, tenant-aware.
- Metrics-Pipeline baut auf `src/lib/observability/metrics.ts`; Collector in `src/lib/monitoring`.
- Trennung: Monitoring = Alerts/Health, Observability (78) = Traces/Deep-Dive.
- Integration: Security (71), Audit (76) als Alert-Quellen; Events → Alert-Router.
- Keine zweite Metrics-Engine: nur bestehende `metrics.ts` erweitern.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `MonitorTarget`: tenantId, kind (service/endpoint/db), ref, intervalSec, enabled.
- `AlertRule`: tenantId, metric, operator, threshold, severity, channel, silenceUntil.
- `AlertIncident`: tenantId, ruleId, state (open/ack/resolved), firedAt, resolvedAt.
- `HealthCheck`: tenantId, targetId, status, latencyMs, checkedAt.
- Tabellen tenant-isoliert via `tenant.ts`; Referenz auf `metrics.ts`-Serien.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `GET /api/v1/monitoring/health` – aggregierter Health-Status je Tenant.
- `POST /api/v1/monitoring/alert-rules` – Regel anlegen (Zod `AlertRuleInput`).
- `GET /api/v1/monitoring/incidents` – offene/vergangene Incidents.
- `POST /api/v1/monitoring/incidents/:id/ack` – Incident bestätigen (Permission `monitor.ack`).
- Endpunkte nutzen `withApiContext`; Metrikerfassung über `metrics.ts`.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `monitoring.alert.fired.v1` – Schwellenwert überschritten.
- `monitoring.incident.acknowledged.v1` – Incident bestätigt.
- `monitoring.incident.resolved.v1` – Incident aufgelöst.
- `monitoring.health.degraded.v1` – Target nicht mehr healthy.
- Consumer: Observability (78), Audit (76).

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Health-Check: Scheduler → Target poll → `HealthCheck` → bei Degradation Alert.
- Alert: Metrik-Evaluation → `AlertRule` treffer → `AlertIncident` → Notification.
- Incident-Lifecycle: Fire → Ack (Still Alert) → Resolve → Event.
- Escalation: unacked Incident nach SLA → Eskalations-Channel.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `sre-agent` Agent: korreliert Incidents, schlägt Runbook/Auto-Remediation vor.
- `capacity-watcher` Agent: prognostiziert Ressourcenengpässe aus Trends.
- Registrierung in Band-11-Runtime; kein eigener Loop.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- `src/app/app/monitoring` Dashboard: Health-Grid, Alert-Feed, Incident-Board.
- Rule-Editor (Server-Action → API); Silent/Maintenance-Window-Toggle.
- Keine Evaluationslogik im Client; serverseitig über Collector.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: AlertRule-Evaluation, Health-Aggregation, Escalation-Timer.
- Integration: Schwellenwert → Incident → Ack → Resolve-Flow.
- Security-Test: Cross-Tenant Alert/Health nicht sichtbar; Metriken tenant-scoped.
- Negative: stillgelegte Regel (silenceUntil) feuert nicht.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- AuthN über Session-System; AuthZ via `rbac.ts` mit `monitor.*`-Permissions.
- Tenant-Isolation via `tenant.ts`; Targets/Incidents strikt tenant-partitioniert.
- Keine Secrets in Health-Payloads; Credentials für Target-Checks im Vault.
- Alert-Channel-Konfiguration ohne Klartext-Tokens in Logs.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `HealthCheck(tenantId, targetId, checkedAt)`, `AlertIncident(tenantId, state)`.
- Collector asynchron (Queue); p95 Health-Abfrage < 30ms.
- Metrik-Evaluation via `metrics.ts` Time-Series; Rule-Cache (TTL 60s).
- Incident-Aggregation über Read-Model, keine Live-Joins im Request-Path.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Security-Test: Cross-Tenant-Monitoring-Block bestanden.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
