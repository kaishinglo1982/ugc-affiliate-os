# Git Swarm Agents

This directory contains versioned operating profiles for the Claude/Git agent
swarm. These files define how coding agents may work in this repository, which
files they own, and which validation gates must pass before work is merged.

The app-internal agent registry is separate from this directory. The profiles
here are for development agents that edit code, documentation, tests, and
deployment assets through Git.

## Operating Model

- The coordinator assigns one bounded scope per worker.
- Workers use short-lived branches and keep commits focused on their scope.
- Workers do not modify production secrets, local `.env*` files, `.claude/`, or
  generated local state unless the task explicitly requires it.
- Workers must preserve unrelated changes and must not revert another worker's
  work without an explicit coordinator decision.
- All worker output lands through a pull request unless the coordinator has
  approved direct push for an emergency fix.

## Required Handoff

Every worker handoff must include:

- Branch name and commit range.
- Files changed by ownership area.
- Validation commands run and results.
- Risks, migrations, feature flags, and rollout notes.
- Follow-up tasks that were intentionally left out of scope.

## Profiles

- `coordinator.md` - swarm orchestration, merges, risk decisions.
- `deploy-ci-docs.md` - deployment, CI, runbooks, environment docs.
- `data-platform.md` - Prisma schema, migrations, seed data, tenant isolation.
- `app-runtime.md` - API routes, services, auth, audit, workers.
- `ui-product.md` - application UI, navigation, dashboards, UX.
- `qa-security.md` - tests, security review, release verification.
