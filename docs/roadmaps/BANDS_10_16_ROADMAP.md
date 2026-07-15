# CarryOS Bands 10–16 Roadmap

This is the overarching dependency and target roadmap for the CarryOS enterprise
platform. It defines the Soll-Zustand (target state). The actual repository code
is the Ist-Zustand (current state); before every implementation a gap analysis
compares Soll against Ist and only real gaps are implemented.

Dependency order must be respected. Do not implement a dependent band before its
prerequisites exist or are explicitly documented as external blockers.

## Band 10 – API Governance

Scope:

- Centralized API contract/versioning policy for all `/api` routes.
- Consistent error envelope, status codes, and Zod-validated request schemas
  across all route handlers.
- Standardized authorization/tenant-isolation wrapper for route handlers so that
  no route handler contains business logic.
- OpenAPI/contract documentation generation for public and internal APIs.
- API deprecation and versioning process.

Prerequisites: none (entry band).

Out of scope: business logic, new agent runtime, new workflow engine.

## Band 11 – Agentic Operating System

Scope:

- Single agent runtime registry (extend `src/server/services/agents.ts`, do not
  duplicate).
- Agent lifecycle: registration, capability discovery, execution, memory.
- Worker/scheduler integration with the existing runtime.
- Agent memory and observability.

Depends on: Band 10 (API contracts for agent endpoints).

## Band 12 – Autonomous Content Factory

Scope:

- Content generation pipeline built on existing `src/lib/content-intelligence`.
- Variant generation, experiments (`src/app/api/experiments/*`), and approvals.
- Idempotent write processes and versioned events.

Depends on: Band 11 (agent execution), Band 10.

## Band 13 – Growth and Publishing

Scope:

- Publishing worker, distribution channels, scheduling.
- Recommendation engine (`src/lib/recommendation`, `src/app/api/recommendations/*`).
- Analytics-driven optimization loop.

Depends on: Band 12.

## Band 14 – Business and Finance

Scope:

- Finance engine (`src/lib/finance`) — no second finance engine.
- Budgets, invoices, payouts, affiliate commissions.
- Audit for critical financial changes.

Depends on: Band 10, Band 13 (revenue data).

## Band 15 – Enterprise Infrastructure

Scope:

- Multi-tenant isolation hardening, workspace scoping.
- Observability, secrets handling, deployment readiness
  (see `docs/agent-swarm-deploy-roadmap.md`).
- Scheduler decision (Vercel Cron / system cron / queue runner).

Depends on: Band 10–14.

## Band 16 – Industry Solution Factory

Scope:

- Plugin/industry edition scaffolding framework.
- Reusable module factory that produces new industry editions without forking
  core.

Depends on: Band 15.

## Status

| Band | Status      | Notes                                  |
| ---- | ----------- | -------------------------------------- |
| 10   | IN_PROGRESS | First band, swarm started              |
| 11   | PLANNED     | Depends on 10                          |
| 12   | PLANNED     | Depends on 11                          |
| 13   | PLANNED     | Depends on 12                          |
| 14   | PLANNED     | Depends on 10, 13                      |
| 15   | PLANNED     | Depends on 10–14                       |
| 16   | PLANNED     | Depends on 15                          |

See `docs/roadmaps/EXECUTION_STATE.md` for the live status and
`docs/bands/band-XX/` for per-band master prompts.
