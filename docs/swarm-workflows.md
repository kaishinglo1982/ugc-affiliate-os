# Swarm Git Workflows

## Branch Naming

Use short-lived branches:

- `swarm/deploy/<task>` for CI, deploy, docs, environment work.
- `swarm/data/<task>` for Prisma, migrations, seed, data contracts.
- `swarm/runtime/<task>` for APIs, services, workers, auth, audit.
- `swarm/ui/<task>` for screens, components, navigation, UX.
- `swarm/qa/<task>` for tests, security review, release verification.
- `coord/<task>` for coordinator integration branches.

## Commit Rules

- Keep commits scoped to one ownership area where possible.
- Use imperative commit messages, for example `Add workflow run audit trail`.
- Do not mix formatting churn with behavior changes.
- Do not commit local-only files: `.env*`, `.claude/`, `.storage/`, reports, or
  credentials.
- Do not rewrite shared history without explicit user approval.

## Pull Request Flow

1. Coordinator opens or assigns a task from the swarm task template.
2. Worker creates a branch matching the assigned profile.
3. Worker implements the change and runs required validation.
4. Worker opens a PR using the repository template.
5. QA/Security reviews risky areas and confirms validation.
6. Coordinator merges when checks pass and risks are documented.
7. Coordinator updates release notes or roadmap when the change affects deploy.

## Required Validation By Change Type

| Change Type | Minimum Validation |
| --- | --- |
| Docs only | Markdown review and link/path sanity check |
| CI/deploy | Workflow syntax review, `pnpm run validate:deploy` when local env allows |
| API/service | `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm run build` |
| Prisma/migration | `pnpm run db:generate`, `pnpm run db:migrate:deploy`, affected tests |
| UI/navigation | Typecheck, lint, build, relevant e2e or documented manual flow |
| Auth/security | Full validation plus QA/Security review |

## Conflict Resolution

- Prefer rebasing worker branches before review if no one else depends on them.
- For integration branches, merge deliberately and preserve worker commits when
  they explain distinct areas of work.
- If two workers edit the same file, the coordinator decides ownership before
  resolving conflicts.
- Never resolve a conflict by deleting another worker's behavior without naming
  the reason in the PR.

## Release Handoff

Before production deploy, the coordinator verifies:

- CI green on the release branch.
- Migrations are applied in a staging or target-compatible database.
- Required secrets exist in the hosting provider.
- Health checks are documented and reachable.
- Worker schedules are configured or intentionally disabled.
- Rollback or disable path is clear for each risky feature.
