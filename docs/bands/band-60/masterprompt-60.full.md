# CarryOS Universe – Band 60
# Masterprompt: Autonomous Planning (VOLLSTÄNDIG)

> Band: 60 | Masterprompt: 60.0 | Status: PLANNED | Gruppe: AI & Automation
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Planungs-Masterprompt. Implementierung erfolgt bandweise über Swarm/Codex, baut auf CarryOS Core + Band 11 Agent Runtime + Band 59 Workflow Agents + Band 51/52/53/58 auf; autonome Zielverfolgung & Planung, keine zweite Planungs-Engine.

## Kapitel 1 – Architektur

Autonomous Planning ist die oberste Steuerungsschicht: Sie nimmt unternehmensweite Ziele je Tenant, zerlegt sie iterativ in Pläne, delegiert an Band 59 Workflow Agents (und darüber an Fachmodule), beobachtet Ergebnisse und passt Pläne selbstständig an. Sie nutzt Band 11 Agent Runtime als einzige Laufzeit und Band 52 RAG + Band 51 Knowledge als Kontextquelle. Keine zweite Planungs-/Agent-Engine; keine eigenständige Ziel-Optimierung außerhalb definierter Guardrails.

- Objective-Engine: Ziele (Objectives) mit Erfolgskriterien, Constraints, Horizon; versioniert je Tenant.
- Planner-Loop: Observe (Telemetrie/Events) → Orient (RAG/Knowledge) → Decide (Plan) → Act (Band 59 Run) → Reflect (Outcome) → Replan.
- Delegation: Pläne werden zu Band 59 Workflow-Agent-Runs; keine direkte Fachlogik im Planer.
- Guardrails: Budgets, Permissions, HITL-Schwellen; autonome Aktionen nur innerhalb erlaubtem Korridor.
- Free-First: Planungs-LLM über Free-Tier; kommerziell nur nach Freigabe.

## Kapitel 2 – Datenmodelle

Planungsdaten streng tenant-isoliert; Objectives/Plans versioniert, Ausführung geloggt.

- `Objective`: id, tenantId, title, criteriaJson, constraintsJson, horizon, status, priority.
- `Plan`: id, tenantId, objectiveId, version, stepsJson, delegationRefs[], confidence, status.
- `PlanStep`: id, tenantId, planId, seq, kind (delegate|observe|reflect), refId, status, resultRef.
- `AutonomyBudget`: id, tenantId, scope, limitJson, usedJson, resetAt, enforcedBy.
- `PlanningTrace`: id, tenantId, objectiveId, loop, decision, rationale, ts, agentTraceRef.
- Unique-Index (tenantId, objectiveId, title); Soft-Delete via deletedAt.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod), Versionierung `/api/v1/planning/*`.

- `POST /api/v1/planning/objectives` – Ziel definieren (criteria, constraints, horizon), idempotent.
- `POST /api/v1/planning/objectives/:id/plan` – Plan erzeugen/lösen, triggert Planner-Loop.
- `GET /api/v1/planning/plans/:id` – Plan + Schritte + Delegationen, tenant-gefiltert.
- `POST /api/v1/planning/plans/:id/replan` – Replan nach Outcome/Schwellwert (Audit).
- `GET /api/v1/planning/objectives/:id/budget` – Autonomie-Budget-Stand je Scope.
- `POST /api/v1/planning/objectives/:id/pause` – Autonomie pausieren (Mensch übernimmt).

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue (Band 15), Namensschema `planning.*.v1`.

- `planning.objective.created.v1` – Ziel definiert, inkl. constraints/horizon, tenantId.
- `planning.plan.proposed.v1` – Plan vorgeschlagen, stepsJson, awaitingBudget/HITL-Flag.
- `planning.step.delegated.v1` – Schritt an Band 59 Workflow-Run delegiert, refId.
- `planning.plan.replanned.v1` – Plan nach Reflect angepasst, version-Bump.
- `planning.budget.exceeded.v1` – Autonomie-Korridor erreicht, Pause/Eskalation. tenantId Pflichtfeld.

## Kapitel 5 – Workflows

Prozesse folgen Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope; idempotent via ExecutionKey.

- Plan-Workflow: Objective → Orient (Band 52/51) → Planner (Band 11) → Schritt-Graph → Budget-Check → `planning.plan.proposed.v1`.
- Execute-Workflow: Schritt → Delegation an Band 59 Run → Outcome-Beobachtung → Reflect → ggf. Replan.
- Budget-Workflow: jedes Delegate prüft AutonomyBudget; bei Überschreitung → Pause + `planning.budget.exceeded.v1`.
- HITL-Workflow: kritischer Plan/Schritt → Band 11 Task → Mensch freigegeben/abgelehnt → Fortsetzung.

## Kapitel 6 – Agenten

Agenten/Rollen in der Band 11 Runtime registriert, keine eigene Planungs-Engine.

- `objective-planner-agent`: zerlegt Ziel in Plan (Observe-Orient-Decide-Act-Reflect).
- `delegation-agent`: mappt Plan-Schritte auf Band 59 Workflow Agents, überwacht Runs.
- `reflection-agent`: evaluiert Outcomes gegen Erfolgskriterien, triggert Replan.
- `guardrail-agent`: überwacht Budget/Permissions/HITL, stoppt außerhalb Korridor.

## Kapitel 7 – UI

Planungs-Oberfläche als Dashboard-Module, keine Fachlogik in Client-Komponenten.

- Objective-Board: Ziele mit Kriterien/Constraints/Horizon, Priorität, Status.
- Plan-Explorer: vorgeschlagene/aktive Pläne mit Schritten + Delegationen (Drill-Down).
- Autonomy-Console: Budget-Stände je Scope, Live-Planner-Loop, Pause/Resume-Buttons.
- Trace-Viewer: Planungsschritte + Rationale (PlanningTrace) zur Nachvollziehbarkeit.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation), Abdeckung Erfolgs-/Fehlerpfade.

- Unit: Planner-Schritt-Graph, Budget-Enforcement, Reflect/Replan-Logik, Constraint-Check.
- Integration: Objective→Plan→Band 59 Delegation→Outcome→Replan Roundtrip.
- Security: Cross-Tenant-Objective-Zugriff mit 403; Delegation erbt tenant-auth + Permission.
- Guardrail-Tests: Plan stoppt bei Budget-Überschreitung; kritischer Schritt blockt ohne HITL.

## Kapitel 9 – Security

Authentifizierung über bestehendes System (keine zweite), Autorisierung via `requireApiPermission`, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- `requireApiPermission("planning:read" | "planning:write" | "planning:control")` je Endpunkt.
- Delegationen laufen mit User-Kontext; Band 59 Permission-Check wird durchgesetzt.
- Kritische Ziele/Pläne zwingend HITL; vollständiges Audit über PlanningTrace + Band 11.
- Keine Ziel-Payload-Geheimnisse in Logs/Events; nur Referenzen, tenantId Pflichtfeld.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Composite-Index (tenantId, objectiveId, status); Index auf Plan (tenantId, objectiveId, version).
- Planner-Loop asynchron via Band 11 Queue; Observe/Reflect entkoppelt über Events.
- Cache: Objective + aktiver Plan im Plan-State, Invalidierung bei Replan/Pause.
- Ziel: Plan-Latenz p95 < 3 s, Delegation-Dispatch p95 < 200 ms, Budget-Check p95 < 5 ms.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Tenant-Isolation-Test grün. 8. Guardrail-Test grün (Budget/HITL erzwingt Korridor).

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
