# Swarm Enterprise Readiness

This checklist is the minimum bar before using the Git swarm for production
delivery.

## Repository Governance

- [x] Versioned worker profiles in `.agents/`.
- [x] PR template with risk, validation, migration, and rollback sections.
- [x] Swarm task issue template.
- [x] Default CODEOWNERS file.
- [x] CI covers install, Prisma generate, migrations, typecheck, lint, unit
  tests, build, and e2e.
- [x] Dependabot is enabled for GitHub Actions and pnpm dependencies.
- [ ] Branch protection enabled in GitHub settings for `master` and `main`.
- [ ] Required checks configured in GitHub settings.
- [ ] Required review count configured in GitHub settings.

## Security Controls

- [x] Secret-bearing files are ignored by `.gitignore`.
- [x] `.claude/` remains local-only and is not versioned.
- [x] Worker profiles prohibit committing secrets or credential payloads.
- [x] QA/Security profile owns auth, RBAC, tenant isolation, and logging review.
- [ ] GitHub secret scanning and push protection enabled in repository settings.
- [ ] Dependabot security updates enabled in repository settings.

## Operational Controls

- [x] Deployment runbook exists in `README.md`.
- [x] Swarm deploy roadmap exists in `docs/agent-swarm-deploy-roadmap.md`.
- [x] Worker handoff format is defined.
- [x] Release handoff criteria are documented.
- [ ] Production secrets provisioned in the hosting provider.
- [ ] Production scheduler selected and configured.
- [ ] Post-deploy health checks automated.

## Recommended GitHub Settings

Enable these settings manually in GitHub because they are not fully controlled by
repository files:

- Protect `master` and `main`.
- Require pull request reviews before merging.
- Require status checks from the CI workflow.
- Require branches to be up to date before merge.
- Dismiss stale approvals when new commits are pushed.
- Restrict who can push directly to protected branches.
- Enable secret scanning, push protection, and Dependabot alerts.
- Require linear history if the team wants rebase-only integration.
