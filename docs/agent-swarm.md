# Claude/Git Agent Swarm

This document defines the enterprise operating model for development agents that
work with this repository through Git. It is separate from the UGC Affiliate OS
runtime agent registry in the application.

## Goals

- Make parallel agent work auditable and reproducible.
- Keep `master` and `main` deployable.
- Prevent scope collisions between workers.
- Preserve security, tenant isolation, and deployment safety.
- Produce handoffs that a human or another agent can continue without guessing.

## Swarm Roles

| Role | Profile | Owns |
| --- | --- | --- |
| Coordinator | `.agents/coordinator.md` | Work split, branch strategy, merge readiness, risk decisions |
| Deploy/CI/Docs | `.agents/deploy-ci-docs.md` | CI, deploy scripts, runbooks, environment docs |
| Data Platform | `.agents/data-platform.md` | Prisma schema, migrations, seed, tenant isolation |
| App Runtime | `.agents/app-runtime.md` | API, services, auth, audit, workers |
| UI Product | `.agents/ui-product.md` | App UI, navigation, dashboards, client workflows |
| QA/Security | `.agents/qa-security.md` | Tests, e2e, security review, release verification |

## Enterprise Controls

- **Versioned profiles:** Worker expectations live in `.agents/`.
- **Pull requests:** Every non-emergency change should enter through a PR.
- **Required checks:** Typecheck, lint, unit tests, build, migrations, and e2e
  are represented in CI.
- **Ownership:** `.github/CODEOWNERS` defines default ownership for reviews.
- **Traceability:** PRs must include scope, validation, risks, rollout, and
  rollback notes.
- **Secrets policy:** No worker may commit secrets, `.env*`, `.claude/`, local
  storage, test output, or credential-bearing payloads.
- **Migration safety:** Data Platform owns schema changes; already-applied
  migrations are not rewritten without coordinator approval.
- **Security review:** QA/Security reviews RBAC, tenant isolation, worker auth,
  logs, and secret handling before merge.

## Standard Work Packet

A coordinator should create a work packet with:

- Objective and business context.
- Assigned profile and allowed file scope.
- Explicit out-of-scope areas.
- Validation gates required for completion.
- Known dependencies and merge order.
- Rollout or migration notes if applicable.

## Worker Handoff Format

```md
## Handoff

Branch:
Commit range:
Profile:
Scope:
Validation:
Risks:
Migrations:
Feature flags:
Rollback:
Follow-ups:
```

## Direct Push Policy

Direct pushes are allowed only when all of the following are true:

- The user or coordinator explicitly approved direct push.
- The change is time-sensitive or already reviewed in the current session.
- The worker reports the final commit SHA and pushed branch.
- A follow-up PR or audit note is created if branch protection requires it.

## Relationship To App Agents

The Git swarm edits this repository. The app's runtime agents live in Prisma
models and `/app/agents`. Runtime agents do not get repository write access by
default; repository changes remain controlled by this Git swarm process.
