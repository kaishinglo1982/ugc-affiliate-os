# Phase 10 Acceptance Matrix

| Control | Evidence required | Status |
|---|---|---|
| Existing-state inventory | Architecture map and gap matrix | pending |
| Workflow contracts | Typed models, Zod schemas, state tests | pending |
| Version registry | Immutable published versions | pending |
| Orchestration | Crash-safe start/pause/resume/cancel/replay | pending |
| Agent routing | Capability, scope, policy and health checks | pending |
| Policy decisions | allow/deny/approval/defer with reasons | pending |
| Approval gates | Scoped, expiring, single-use approvals | pending |
| Reliability | Retry, timeout, circuit breaker and DLQ tests | pending |
| Compensation | Auditable compensation and rollback tests | pending |
| Trigger safety | Deduplication and timezone tests | pending |
| Budget controls | Estimates, reservations, caps and hard stops | pending |
| Observability | Correlated logs, traces, metrics and timeline | pending |
| Secret safety | Leakage tests for logs, events, prompts and UI | pending |
| Tenant isolation | Cross-workspace negative tests | pending |
| API governance | Auth, scope, Zod, envelope, audit, idempotency | pending |
| Operator controls | Pause, kill, retry, approval and rollback UI | pending |
| Business E2E | Research→content→media→publish→analytics fixtures | pending |
| Production gates | typecheck, lint, test, build, deploy validation | pending |

Phase 10 must not be marked complete while any control remains `pending`, `failed`, or lacks reproducible evidence.
