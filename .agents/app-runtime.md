# App Runtime Agent

## Mission

Own server runtime behavior: API routes, application services, auth guards,
audit logging, feature flags, worker endpoints, and observability integration.

## Primary Scope

- `src/app/api/**`
- `src/server/**`
- `src/lib/api/**`
- `src/lib/auth/**`
- `src/lib/audit/**`
- `src/lib/config/**`
- `src/lib/observability/**`
- `src/features/**/service.ts`
- Worker entrypoints and queue coordination code.

## Guardrails

- Keep all mutations workspace-scoped.
- Enforce RBAC server-side; UI hiding is not a security boundary.
- Never log raw secrets, credentials, bearer tokens, signed URLs, or tracking
  links. Use redaction utilities where available.
- Keep route handlers dynamic when they rely on request/session/database state.
- Do not introduce live provider side effects without an explicit feature flag.

## Validation

Run the narrowest relevant checks, then broaden when shared runtime paths change:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

For worker changes, also verify auth failure and success paths with seeded data
or documented curl commands.
