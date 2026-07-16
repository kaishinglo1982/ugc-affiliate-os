# Phase 1 — Agent Swarm Work Packets

Tracking issue: #8

## Execution rules

- Inventory before implementation; extend existing services instead of creating parallel cores.
- One packet per branch or clearly isolated commit range.
- No direct push to `master`.
- Productive TypeScript must remain strict and must not introduce `any`.
- Schema changes belong to Data Platform and require forward/rollback notes.
- Every packet ends with tests, risk notes and a handoff.

## Merge order

1. P1-A inventory and route/control map
2. P1-B data and isolation hardening
3. P1-C auth, RBAC, vault and audit hardening
4. P1-D jobs, idempotency, registries and storage
5. P1-E observability, CI and deployment controls
6. P1-F independent QA/security verification
7. P1-G coordinator completion report

---

## P1-A — Foundation inventory

**Profile:** Coordinator with QA/Security

**Scope**

- Map routes, services, Prisma models, migrations, tests and infrastructure.
- Map every Phase-1 control to existing code.
- Identify duplicates, placeholders and uncovered write routes.
- Produce a prioritized gap table: P0, P1, P2, P3.

**Outputs**

- Updated `docs/phase-1/acceptance.md` with concrete paths.
- Route matrix: auth, workspace scope, permission, validation, audit, idempotency.
- No implementation changes unless needed to make the audit reproducible.

**Gate**

- Every finding has path, impact, owner and acceptance test.

---

## P1-B — Data platform and isolation

**Profile:** Data Platform

**Allowed scope**

- `prisma/**`
- workspace/tenant context helpers
- repository/data-access boundaries
- isolation and migration tests

**Objectives**

- Verify every workspace-owned record has an enforceable owner boundary.
- Prevent cross-workspace reads and writes at the lowest practical layer.
- Validate migration ordering and deploy safety.
- Add positive and negative isolation tests.

**Out of scope**

- UI redesign
- provider-specific business logic
- rewriting applied migrations

**Gate**

- Cross-workspace reads/writes fail safely.
- Migration deploy works from an empty database and from the previous schema state.

---

## P1-C — Auth, RBAC, vault and audit

**Profile:** App Runtime

**Objectives**

- Centralize authenticated request context.
- Enforce permission registry with default deny.
- Ensure credentials use authenticated AES-256-GCM encryption, masked presentation and versioned rotation metadata.
- Attach correlation IDs and actor/workspace context to critical audit events.
- Remove secret-bearing values from responses, logs, events and prompts.

**Required negative tests**

- missing/expired session;
- valid user without permission;
- wrong workspace;
- malformed encrypted payload;
- attempted secret serialization;
- critical write without audit context.

**Gate**

- Auth, RBAC, vault and audit controls have unit and integration evidence.

---

## P1-D — Jobs, idempotency, registries and storage

**Profile:** App Runtime

**Objectives**

- Verify worker endpoints require a valid worker credential in deployed environments.
- Standardize retry/backoff and dead-letter behavior.
- Persist or otherwise reliably enforce idempotency for critical write actions.
- Verify feature flag, licensing and provider registries are typed and default safe.
- Verify local and S3-compatible storage adapters share a stable contract.

**Required tests**

- invalid/missing worker secret;
- repeated identical write request;
- failed job retry and terminal dead-letter path;
- disabled flag/license capability;
- storage adapter contract.

**Gate**

- Replays do not duplicate externally visible effects.

---

## P1-E — Observability, CI and deployment

**Profile:** Deploy/CI/Docs

**Objectives**

- Ensure structured logs carry correlation/workspace/job identifiers without secrets.
- Verify health endpoints represent dependency degradation correctly.
- Keep CI gates for Prisma generation, migrations, typecheck, lint, tests, build and e2e.
- Add explicit migration-status and deploy-validation evidence where missing.
- Document local, CI and production environment requirements.

**Gate**

- A clean checkout can execute the documented validation flow.
- CI failures identify the failing control rather than masking it.

---

## P1-F — Independent QA and security gate

**Profile:** QA/Security

**Objectives**

- Review all packet diffs independently.
- Run deny-path, cross-workspace, replay, secret-leakage and worker-auth tests.
- Search productive TypeScript for new `any` usage.
- Verify no credentials or local environment files are committed.
- Classify residual findings.

**Gate**

- No open P0/P1 finding.
- All mandatory commands pass or a reproducible infrastructure blocker is documented.

---

## P1-G — Completion and handoff

**Profile:** Coordinator

**Outputs**

- Final Phase-1 completion report using the template in `acceptance.md`.
- Exact commit range and CI links.
- Migration, rollout and rollback notes.
- Deferred P2/P3 items converted to issues with owners.
- Phase 2 dependency statement.

## Required handoff format

```md
## Handoff

Branch:
Commit range:
Profile:
Packet:
Scope:
Files changed:
Validation:
Findings resolved:
Residual risks:
Migrations:
Feature flags:
Rollback:
Follow-ups:
```
