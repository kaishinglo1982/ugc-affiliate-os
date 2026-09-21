# UGC Affiliate OS

Deployable Next.js app for affiliate product research, content operations, analytics, workflow automation, and worker-triggered jobs.

## Requirements

- Node `>=20.9.0 <25`
- pnpm `11.13.0` via Corepack
- PostgreSQL

```bash
corepack enable
corepack prepare pnpm@11.13.0 --activate
pnpm install
```

## Environment

Copy `.env.example` to `.env.local` for local development and set at least:

- `DATABASE_URL`
- `AUTH_SECRET` with 32+ characters
- `CREDENTIAL_ENCRYPTION_KEY` as 64 hex characters from `openssl rand -hex 32`
- `APP_URL`, for example `http://localhost:3000`

Set `ADMIN_EMAIL` plus either `ADMIN_PASSWORD_HASH` for production or `ADMIN_PASSWORD` for local/CI seeding. Set `WORKER_SECRET` and `CRON_SECRET` in deployed environments before wiring cron jobs.

## Database

```bash
pnpm run db:generate
pnpm run db:migrate
pnpm run db:seed
pnpm run db:status
```

Use `pnpm run db:migrate:deploy` in CI and production. Avoid `pnpm run db:reset` outside throwaway local databases.

## Local Development

```bash
pnpm run dev
```

The app runs at `http://localhost:3000`. Local media storage writes to `.storage/` when S3 variables are absent. Production should set `S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and optionally `S3_ENDPOINT`/`S3_REGION` for persistent object storage.

## Validation

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
pnpm run validate:deploy
```

E2E tests require a migrated and seeded PostgreSQL database:

```bash
pnpm exec playwright install chromium
pnpm run build
pnpm run test:e2e
```

`playwright.config.ts` starts `pnpm start` automatically unless `E2E_SKIP_WEBSERVER` is set.

## Health Checks

- `GET /api/health` returns app status plus environment validation.
- `GET /api/health/database` verifies PostgreSQL connectivity and returns `503` when degraded.

## Cron And Workers

Set `WORKER_SECRET` in production and call worker endpoints with `Authorization: Bearer $WORKER_SECRET`.

- `POST /api/analytics/jobs/run`
- `POST /api/products/jobs/run`
- `POST /api/publishing/worker`

Helper scripts:

```bash
APP_BASE_URL=https://your-app.example WORKER_SECRET=... scripts/run-analytics-cron.sh
APP_BASE_URL=https://your-app.example WORKER_SECRET=... scripts/run-product-research-cron.sh
```

## CI

GitHub Actions runs install, Prisma client generation, typecheck, lint, unit tests, and build. The e2e job starts a PostgreSQL service, applies migrations, seeds, installs Chromium, builds, starts the app through Playwright, and runs `test:e2e`.

## Claude/Git Agent Swarm

The development swarm is versioned separately from the app's runtime agents.
Start with `docs/agent-swarm.md` for roles, `.agents/` for worker profiles, and
`docs/swarm-workflows.md` for branch, PR, validation, and handoff rules.
