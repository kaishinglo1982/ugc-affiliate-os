# Production Tech Stack

## Runtime baseline

| Layer | Standard |
|---|---|
| Application | Next.js App Router with React and strict TypeScript |
| Package management | pnpm with an exact repository-pinned version |
| Runtime | Supported Node.js LTS-compatible range; CI uses Node.js 22 |
| Database | PostgreSQL 16 with Prisma migrations and explicit SQL adapters for concurrency-critical paths |
| Validation | Zod at environment, API and domain boundaries |
| Unit and integration tests | Vitest |
| Browser E2E | Playwright with Chromium |
| Styling and components | Tailwind CSS and Radix UI primitives |
| Authentication | Database-backed sessions with signed JWT transport and revocable hashed session secrets |
| Deployment | Next.js standalone output; Vercel-compatible and container-compatible |
| CI | GitHub Actions with architecture, migration, type, lint, test, build and E2E gates |

## Non-negotiable engineering rules

- Strict TypeScript remains enabled; productive `any` is prohibited.
- Environment variables are parsed through the canonical typed environment module.
- Production rejects known CI credentials and non-HTTPS application URLs.
- All database migrations are immutable after application.
- Concurrency-sensitive work uses PostgreSQL transactions, locks, leases and idempotency rather than process-local state.
- External effects pass through governed gateways with workspace scope, policy checks and audit evidence.
- New dependencies require a documented purpose, license compatibility and an owner.
- Dependencies are updated through grouped Dependabot pull requests and must pass the complete validation pipeline.
- Framework security defaults are explicit in `next.config.ts`; application-specific CSP is added only after route and asset compatibility tests.

## Quality gates

The canonical local gate is:

```bash
pnpm run validate
```

It executes:

1. project architecture validation;
2. TypeScript typecheck;
3. ESLint;
4. Vitest;
5. production build.

Deployment validation additionally generates the Prisma client. GitHub Actions applies migrations to clean PostgreSQL services and runs a separate Playwright E2E job.

## Dependency policy

- Exact versions are preferred for runtime-critical framework packages.
- Version ranges are allowed for compatible supporting packages only when the lockfile remains committed.
- Major upgrades require a dedicated pull request, migration notes and rollback instructions.
- Next.js, React, Prisma and testing packages are grouped separately to keep upgrades reviewable.
- GitHub Actions dependencies are maintained independently from application dependencies.

## Production hardening

The Next.js production configuration enables:

- standalone output;
- response compression;
- React strict mode;
- disabled framework signature header;
- disabled browser production source maps;
- anti-framing, MIME-sniffing, referrer, permissions and cross-origin isolation headers.

A strict Content Security Policy is intentionally not hard-coded without a nonce strategy and E2E validation, because an incorrect CSP can break Next.js hydration or third-party provider callbacks. CSP rollout belongs in a dedicated security change with report-only telemetry first.

## Remaining evidence

A 10/10 stack rating requires evidence, not configuration alone:

- complete GitHub Actions run visible and green;
- dependency audit with no unaccepted critical vulnerabilities;
- clean migration deploy from an empty database;
- production-like E2E run;
- documented backup and restore exercise;
- load and failure-recovery evidence for workflow workers.
