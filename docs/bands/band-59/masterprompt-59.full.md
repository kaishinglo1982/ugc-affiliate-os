# CarryOS Universe – Band 59
# Masterprompt: Workflow Agents (VOLLSTÄNDIG)

> Band: 59 | Masterprompt: 59.0 | Status: PLANNED | Gruppe: AI & Automation
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Planungs-Masterprompt. Implementierung erfolgt bandweise über Swarm/Codex, baut auf CarryOS Core + Band 11 Agent Runtime (Workflow Engine) + Band 51/52/53/58 auf; KI-gestützte Prozessautomatisierung, keine zweite Workflow Engine.

## Kapitel 1 – Architektur

Workflow Agents sind KI-Agenten, die mehrstufige Geschäftsprozesse je Tenant autonom planen, ausführen und überwachen – auf Basis der bestehenden Band 11 Workflow Engine. Sie nutzen Tool-Adapter auf bestehende Module (Band 41 CRM, 44 Angebot, 14 Finance) und greifen auf Wissen (Band 51), RAG (Band 52), Dokumente (Band 53) und Meeting-Action-Items (Band 58) zu. Keine zweite Workflow-/Agent-Engine.

- Agent-Definition: deklaratives Workflow-Spec (Schritte, Bedingungen, Tools, HITL-Gates) in Prisma, ausgeführt von Band 11.
- Tool-Registry: registrierte Adapter auf bestehende APIs, tenant-auth, Zod-validierte Ein/Ausgaben.
- Planner: zerlegt Ziel in Schritte (ReAct/Plan-Execute) innerhalb Band 11 Agent-Laufzeit.
- HITL-Gates: kritische Schritte (z. B. Zahlung, Vertrag) erfordern menschliche Freigabe (Band 11 Task).
- Free-First: Planung/Reasoning über Free-Tier-LLM; kommerziell nur nach Freigabe.

## Kapitel 2 – Datenmodelle

Workflow-Agent-Daten streng tenant-isoliert; Specs versioniert, Ausführungen geloggt.

- `WorkflowAgent`: id, tenantId, name, goal, specJson, tools[], hitlGates[], isActive, version.
- `WorkflowRun`: id, tenantId, agentId, trigger, status, startedBy, startedAt, finishedAt.
- `WorkflowStep`: id, tenantId, runId, seq, name, tool, args, resultRef, status, approvedBy.
- `WorkflowToolBinding`: id, tenantId, tool, adapterRef, schemaRef, requiredPermission.
- `WorkflowRunLog`: id, tenantId, runId, level, message, ts, agentTraceRef.
- Unique-Index (tenantId, agentId, name); Soft-Delete via deletedAt.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod), Versionierung `/api/v1/workflows/*`.

- `POST /api/v1/workflows/agents` – Workflow-Agent (goal, spec, tools) anlegen, idempotent.
- `POST /api/v1/workflows/agents/:id/run` – Ausführung triggern (trigger-Payload, Zod), ExecutionKey.
- `GET /api/v1/workflows/runs/:id` – Run-Status + Schritte + Ergebnisse, tenant-gefiltert.
- `POST /api/v1/workflows/runs/:id/steps/:stepId/approve` – HITL-Gate freigeben (Audit).
- `GET /api/v1/workflows/agents/:id/tools` – gebundene Tool-Adapter + nötige Permissions.
- `POST /api/v1/workflows/agents/:id/version` – Spec versioniert aktualisieren/rollout.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue (Band 15), Namensschema `workflow.*.v1`.

- `workflow.agent.created.v1` – Agent definiert, inkl. tools/hitlGates, tenantId.
- `workflow.run.started.v1` – Ausführung begonnen, verlinkt trigger. Keine Payload-Inhalte.
- `workflow.step.completed.v1` – Schritt erledigt, tool + resultRef, awaitingApproval-Flag.
- `workflow.run.finished.v1` – Run abgeschlossen (success|failed|blocked), Outcome-Ref.
- `workflow.hitl.requested.v1` – Freigabe nötig, erzeugt Band 11 Task. tenantId Pflichtfeld.

## Kapitel 5 – Workflows

Prozesse folgen Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope; idempotent via ExecutionKey.

- Plan-Workflow: Ziel → Planner (Band 11) → Schritt-Graph → Spez-Validierung → Version-Store.
- Run-Workflow: Trigger → Schritt-Ausführung (Tool-Adapter, tenant-auth) → ggf. HITL → nächster Schritt → `workflow.run.finished.v1`.
- Approval-Workflow: HITL-Gate → Band 11 Task → Mensch freigegeben/abgelehnt → Fortsetzung/Abbruch + Audit.
- Failure-Workflow: Tool-Fehler → Retry-Policy → Eskalation → `workflow.run.finished.v1` (failed).

## Kapitel 6 – Agenten

Agenten/Rollen in der Band 11 Runtime registriert, keine eigene Engine.

- `workflow-planner-agent`: zerlegt Ziel in validierten Schritt-Graph (Plan-Execute).
- `workflow-executor-agent`: führt Schritte via Tool-Adapter aus, überwacht Status.
- `workflow-validator-agent`: prüft Spec/Kontext (Guardrails, Permissions) vor Ausführung.
- `workflow-escalation-agent`: bei Block/Failure → Eskalation + Audit-Zusammenfassung.

## Kapitel 7 – UI

Workflow-Oberfläche als Dashboard-Module, keine Fachlogik in Client-Komponenten.

- Workflow-Builder: Ziel/Spec/Tools/HITL-Gates deklarativ konfigurieren, Version-Diff.
- Run-Monitor: Live-Schritte mit Status, Tool-Calls, Approve-Buttons für Gates.
- Tool-Registry-View: gebundene Adapter + nötige Permissions je Tenant.
- Outcome-Dashboard: Run-Erfolgsquote, Dauer, eskalierte Runs je Agent.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation), Abdeckung Erfolgs-/Fehlerpfade.

- Unit: Spec-Validierung, Planner-Schritt-Graph, Tool-Args-Zod, Retry-Policy, HITL-Flow.
- Integration: Run→Tool-Adapter→Band 41/44 API Roundtrip; Event→Run-Status-Persistenz.
- Security: Cross-Tenant-Run-Zugriff mit 403; Tool-Calls mit tenant-auth, Permission-Check.
- Guardrail-Tests: Agent kann kritischen Schritt ohne HITL nicht ausführen.

## Kapitel 9 – Security

Authentifizierung über bestehendes System (keine zweite), Autorisierung via `requireApiPermission`, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- `requireApiPermission("workflows:read" | "workflows:write" | "workflows:approve")` je Endpunkt.
- Tool-Adapter erben User-Kontext; Permission `requiredPermission` wird vor Aufruf geprüft.
- Kritische Gates (Finance/Vertrag) zwingend HITL; Audit-Log für jeden Schritt/Approval.
- Keine Tool-Payload-Geheimnisse in Logs/Events; nur Referenzen, tenantId Pflichtfeld.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Composite-Index (tenantId, agentId, status); Index auf WorkflowStep (tenantId, runId, seq).
- Schritt-Ausführung asynchron via Band 11 Queue; parallele unabhängige Schritte gebündelt.
- Cache: Tool-Schema + Agent-Spec im Run-State, Invalidierung bei Versionswechsel.
- Ziel: Plan-Latenz p95 < 2 s, Schritt-Ausführung p95 < 1 s (ohne externen Call), Run-Status-Query p95 < 40 ms.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Tenant-Isolation-Test grün. 8. HITL-Guardrail-Test grün (kein kritischer Schritt ohne Freigabe).

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
