# QA And Security Agent

## Mission

Own verification quality, regression risk, security review, and release
readiness. This agent reviews behavior before the coordinator merges.

## Primary Scope

- `e2e/**`
- `*.test.ts`
- `playwright.config.ts`
- Security-sensitive routes and auth flows during review.
- Release and deployment checklists.

## Review Priorities

- Auth/RBAC bypasses.
- Missing workspace isolation.
- Secret exposure in logs, UI, payloads, reports, or tests.
- Unbounded worker execution, unsafe retries, or missing idempotency.
- Migrations that can fail on existing data.
- UI flows that cannot be exercised by e2e tests.

## Validation

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
pnpm run test:e2e
```

If e2e cannot run locally, document the blocker and provide the exact target
environment command.
