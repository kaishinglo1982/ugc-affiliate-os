# Phase 10 — Agentic Automation Engine

## Status

Execution started on branch `phase-10-agentic-automation`. Subphases 10.1–10.7 are implemented and locally validated (typecheck, lint, test, migrations, project-structure check). Repository-wide CI evidence is still required before any subphase or the phase as a whole is marked complete, and is currently **blocked**: `.github/workflows/ci.yml` fails on every push repo-wide (see `10.6-completion-report.md`, "CI status") for a cause outside this session's access (likely an account-level Actions spending limit). Current work packet: 10.8 (Reliability and Compensation).

## Objective

Build a policy-governed automation and agent orchestration layer that reuses the existing auth, RBAC, audit, queue, provider, storage, analytics, finance, publishing, and agent foundations. No duplicate runtime, queue, workflow, or policy core may be introduced.

## Delivery sequence

### 10.1 Existing-state inventory and architecture map
- Map workflow, job, event, agent, queue, audit, idempotency, RBAC, budget, provider, and approval primitives.
- Record reuse, extension, replacement, and deletion decisions.
- Gate: no implementation starts without a signed gap matrix.

### 10.2 Domain contracts and state machines
- Define versioned WorkflowDefinition, WorkflowVersion, WorkflowRun, WorkflowStepRun, Task, ApprovalRequest, PolicyDecision, CompensationRun, and AutomationSchedule contracts.
- Define deterministic state transitions and terminal states.
- Gate: Zod contracts and state-machine tests.

### 10.3 Workflow definition registry
- Versioned definitions, immutable published versions, draft/publish lifecycle, compatibility metadata, and dependency references.
- Gate: published definitions cannot be modified in place.

### 10.4 Run orchestration core
- Start, pause, resume, cancel, retry, and replay workflow runs.
- Persist step state, input/output references, correlation IDs, and causation IDs.
- Gate: crash-safe resume and idempotent start.

### 10.5 Agent capability registry and task routing
- Register agents, skills, constraints, cost classes, provider requirements, and health.
- Route tasks using capability, tenant, policy, budget, and availability.
- Gate: no task reaches an unauthorized or incompatible agent.

### 10.6 Policy engine
- Evaluate budget, compliance, risk, tenant, provider, rate-limit, data-classification, and reversibility policies.
- Return allow, deny, require-approval, or defer decisions with reasons.
- Gate: deny by default for unknown actions and missing context.

### 10.7 Human approval gates
- Approval queues, expiry, escalation, four-eyes support, comments, and signed decisions.
- Irreversible, financial, publishing, credential, and high-risk actions require policy-defined approval.
- Gate: approvals are scoped, single-use, auditable, and cannot be replayed.

### 10.8 Reliability and compensation
- Retry with bounded exponential backoff, timeouts, circuit breakers, DLQ, compensation actions, and partial-failure handling.
- Gate: poison jobs cannot loop indefinitely; compensation is independently auditable.

### 10.9 Scheduling and triggers
- Cron, event, webhook, manual, threshold, and dependency triggers.
- Deduplication, trigger windows, missed-run policy, and timezone-safe schedules.
- Gate: duplicate triggers create at most one effective run.

### 10.10 Cost and budget controls
- Pre-flight estimates, per-run caps, workspace budgets, provider budgets, reservations, actual-cost reconciliation, and hard stops.
- Gate: no over-budget automatic execution.

### 10.11 Observability and audit
- Structured logs, traces, metrics, run timelines, policy decisions, approval evidence, cost metrics, and agent performance.
- Gate: every critical transition is traceable by correlation ID without leaking secrets.

### 10.12 Security and tenant isolation
- Workspace scope on all records and commands, least privilege, encrypted sensitive references, worker authentication, and prompt/tool injection boundaries.
- Gate: cross-tenant and privilege-escalation negative tests.

### 10.13 API and operator console
- Governed APIs for definitions, runs, tasks, approvals, schedules, policies, and kill switches.
- Operator UI for status, intervention, approvals, replay, rollback, and evidence.
- Gate: every write has auth, scope, validation, idempotency where required, audit, and standard response envelopes.

### 10.14 End-to-end business workflows
- Product research to content package.
- Approved content to video production.
- Approved media to publishing.
- Analytics signal to low-risk optimization recommendation.
- Finance/cost ingestion with approval boundaries.
- Gate: deterministic E2E fixtures and rollback paths.

### 10.15 Production hardening and completion audit
- Load, concurrency, failure injection, recovery, migration, deployment, backup/restore, runbook, and security review.
- Gate: typecheck, lint, unit, integration, E2E, build, deployment validation, and completion report green.

## Swarm ownership

| Workstream | Primary owner | Mandatory reviewer |
|---|---|---|
| Architecture and merge control | Coordinator | QA/Security |
| Prisma and persistence | Data Platform | App Runtime |
| Orchestration and APIs | App Runtime | QA/Security |
| Queue, triggers, reliability | App Runtime | Deploy/CI/Docs |
| Policies and approvals | App Runtime | QA/Security |
| Operator console | UI Product | QA/Security |
| CI, deployment, runbooks | Deploy/CI/Docs | Coordinator |
| Negative tests and completion audit | QA/Security | Coordinator |

## Global non-negotiable gates

- No productive TypeScript `any`.
- No duplicate platform core.
- Tenant/workspace isolation on every persisted and executable object.
- Deny by default when policy, identity, scope, or capability context is incomplete.
- No secrets in logs, events, prompts, outputs, UI, or audit payloads.
- Critical writes and external effects are idempotent.
- Automatic actions are bounded by budget, risk, approval, reversibility, and kill-switch policies.
- All external effects have evidence, correlation, rollback or compensation semantics.
- Applied migrations are never rewritten.
- Phase 10 is complete only with reproducible green CI and a signed completion report.

## Required handoff per subphase

```md
## Phase 10.x Handoff
Branch:
Commit range:
Owner profile:
Scope delivered:
Existing primitives reused:
Schema/migrations:
APIs/events/jobs:
Policies/approvals:
Validation executed:
Security findings:
Risks and limitations:
Rollback/compensation:
Next dependency:
```
