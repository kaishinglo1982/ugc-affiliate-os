# Agent Swarm Deploy Roadmap

This roadmap consolidates deploy-readiness work from the swarm into P0/P1/P2 buckets. This worker owned only deployment, CI, and documentation files.

## Constraints

- Write scope for this pass: `README.md`, `.env.example`, `package.json`, `eslint.config.mjs`, `.github/workflows/**`, and this roadmap.
- Do not edit Prisma schema/migrations/seed, campaign APIs/services, `src/lib/config/env.ts`, or health routes in this pass.
- `AGENTS.md` requires reading local Next docs before code changes. The path was missing before dependencies were repaired; after `pnpm install`, the relevant local docs were read from `node_modules/next/dist/docs/`.

## P0 - Deploy Blockers

- [x] Pin runtime tooling with `packageManager: pnpm@11.13.0` and `engines.node: >=20.9.0 <25`.
- [x] Add deployment validation and DB status scripts without replacing existing scripts.
- [x] Ignore generated and artifact outputs in ESLint: Prisma client output, Playwright reports, graphify output, coverage, and test results.
- [x] Add CI validation for install, Prisma generate, typecheck, lint, unit tests, and build.
- [x] Add Postgres-backed e2e validation with migrations, seed, Chromium install, build, app start, and `test:e2e`.
- [x] Replace scaffold README with deploy/runbook documentation.
- [x] Add environment placeholders for worker, workspace, app base URL, and storage/runtime secrets in `.env.example`.
- [ ] Confirm production build behavior after app/runtime agents resolve any module-scope database/client initialization issues. Current `src/lib/db/client.ts` initializes Prisma at module scope, which is risky during `next build` when routes are evaluated.
- [ ] Ensure all production secrets are provisioned in the hosting provider before first deploy: `DATABASE_URL`, `AUTH_SECRET`, `CREDENTIAL_ENCRYPTION_KEY`, `APP_URL`, and `WORKER_SECRET`.

## P1 - Operational Hardening

- [ ] Decide on the production scheduler: Vercel Cron, system cron, or queue runner for analytics, product research, and publishing worker endpoints.
- [ ] Verify `/api/health` and `/api/health/database` from the deployed URL after migrations run.
- [ ] Configure persistent object storage in production with S3-compatible credentials; local `.storage/` is only suitable for development.
- [ ] Add protected deployment smoke checks that hit health endpoints after each production deploy.
- [ ] Review whether the e2e suite should upload Playwright traces/reports as artifacts on failure.

## P2 - Follow-Up Improvements

- [ ] Split slow checks or add dependency caching refinements if CI duration becomes a bottleneck.
- [ ] Add a documented rollback procedure for database migrations and app deployments.
- [ ] Add release notes/checklist templates for future swarm deploy waves.
- [x] Revisit local Next documentation once `node_modules/next/dist/docs/` is available in the workspace.
