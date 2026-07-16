# CarryOS Universe – Band 15
# Masterprompt: Enterprise Infrastructure (VOLLSTÄNDIG)

> Band: 15 | Masterprompt: 15.0 | Status: DOCUMENTED | Gruppe: Core Intelligence
> Abhängigkeit: Band 10 (API Governance), Band 11 (Agentic OS)

> Hinweis: Dieser Band hat Code-Bezug im Repository; Masterprompt verweist auf bestehende Module in `src/lib/observability/` und `src/server/services/agents.ts`.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Enterprise Infrastructure liefert Observability, Metriken, Logging und Agent-Laufzeit-Basis. Bestehende `src/lib/observability/metrics.ts` wird erweitert. Keine zweite Runtime/Engine/Queue/Finance.

- Observability ist der einzige Metrik/Log-Kanal (`METRICS`, `incrementMetric`, `recordMetric`, `logStructured`).
- Agent-Laufzeit nutzt `src/server/services/agents.ts` (`agent`, `agentRun`, `agentToolDefinition`) als einzige Quelle — keine zweite Agent Runtime.
- Secret-Redaction (`redact`/`redactText`) ist zentraler Pflicht-Pfad für alle Logs.
- Infrastruktur-Queues bauen auf der bestehenden Outbox/Queue aus Band 10; keine Parallel-Queue.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `Agent`, `AgentRun`, `AgentToolDefinition` (bereits in `agents.ts`) mit `workspaceId`/`tenantId`.
- `MetricSnapshot` (periodische Persistenz von `getMetricsSnapshot()`), `AuditLog` mit `correlationId`.
- `InfraAlert` (threshold-basiert auf `METRICS`-Werten), `TenantUsageQuota` (tenantId, limit, used).
- Alle Queries über Repository mit obligatorischem `tenantId`/`workspaceId`-Filter.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `GET /api/v1/infra/metrics` – liefert `getMetricsSnapshot()` (tenant- oder global-scoped je nach Permission).
- `GET /api/v1/infra/agents` – listet Agenten via `listAgents()` aus `agents.ts`.
- `GET /api/v1/infra/agent-runs` – `listAgentRuns()` mit Filter (tenant-isoliert).
- `POST /api/v1/infra/alerts/ack` – Ack eines `InfraAlert`, auditierbar.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `infra.metric.snapshot.v1` – periodische Persistenz der Metriken.
- `infra.agent.run.started.v1` / `infra.agent.run.finished.v1` – aus `agentRun`-Lifecycle.
- `infra.alert.raised.v1` / `infra.alert.acked.v1` – Schwellwert-Verletzungen.
- `infra.quota.exceeded.v1` – bei Überschreitung von `TenantUsageQuota`.

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Metrics-Snapshot-Flow: Collect → `recordMetric`/`getMetricsSnapshot` → Persistenz → `infra.metric.snapshot.v1`.
- Agent-Run-Flow: `listAgentRuns`/`getAgentRun` aus `agents.ts` → Envelope (lesend, tenant-isoliert).
- Alert-Flow: Threshold-Check → `infra.alert.raised.v1` → Ack idempotent via ExecutionKey.
- Keine Fachlogik in Route Handlern; Infra-Services im Service-Layer.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime.

- `infra-monitor` Agent: periodische Metrik-Sammlung und Snapshot-Erzeugung.
- `alert-manager` Agent: evaluiert `METRICS` gegen Thresholds, erzeugt/ackt Alerts.
- `quota-enforcer` Agent: überwacht `TenantUsageQuota`, triggert `infra.quota.exceeded.v1`.
- Agent-Definitionen in `agentToolDefinition` mit Policies (nur Infra-Scope).

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- Observability-Dashboard: Live-Karten für `contentAnalysisTotal`, `experimentStartedTotal`, `recommendationGeneratedTotal`.
- Agent-Run-Monitor: Tabelle aus `listAgentRuns` mit Status, Tool-Calls (`getAgentRun`).
- Alert-Center: Liste offener `InfraAlert` mit Ack-Aktion.
- Quota-View: `TenantUsageQuota` Fortschritt pro Tenant.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: `redact`/`redactText` maskieren Secrets und Tracking-URLs korrekt (Testvektoren).
- Unit: `incrementMetric`/`getMetricsSnapshot` liefern konsistente Werte.
- Integration: `GET /api/v1/infra/metrics` mit/ohne Permission (global vs tenant).
- Security: Cross-Tenant-Lesezugriff auf fremde `AgentRun` → 403.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- `requireApiPermission("infra:read|infra:alert")` auf Endpunkten; globale Metriken nur für Platform-Role.
- `logStructured` erzwingt `redact` für PII/Secrets/Tracking-URLs vor Emit.
- `correlationId`/`workspaceId` Pflicht in allen Struktur-Logs.
- Keine Provider-Keys in Metriken oder Agent-Metadaten.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `MetricSnapshot(tenantId, ts)`, `AgentRun(tenantId, startedAt)`, `InfraAlert(tenantId, status)`.
- Snapshot-Erfassung asynchron; `analyticsSyncDurationMs` reuse als p95-Leitmetrik (<500ms).
- Metriken-Cache: `getMetricsSnapshot()` in-memory, periodisch geflusht (kein DB-Hot-Path).
- Quota-Checks im Request-Pfad O(1) via gecachte `TenantUsageQuota`.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines/Queues.
7. Redaction-Pfad in allen Logs verifiziert.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
