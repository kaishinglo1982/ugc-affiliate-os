# UGC Affiliate OS — 10/10 completion gate

## Scope

This release block closes the production-readiness chain:

Campaign/Media migration reconciliation → workspace RLS → transaction-scoped workspace context → negative cross-workspace isolation → E2E → 10x10 CI gate.

## Database

The Prisma schema currently contains the campaign/media production models and 100+ workspace-scoped models. The release migration activates RLS and FORCE RLS for every public base table carrying `workspaceId`, using the transaction-local `app.current_workspace_id` setting.

The migration is additive and contains no `DROP TABLE`, `DROP DATABASE`, or `db push`.

## Isolation

All application workspace persistence is required to establish the workspace setting inside `prisma.$transaction`. This prevents connection-pool leakage of the RLS context.

Negative isolation tests assert the FORCE RLS policy contract and transaction-bound context.

## CORE_BOUND

UGC production authorization requires an active CarryOS plugin binding containing tenant, workspace, PluginInstallation, ServicePrincipal and contract version. Missing/revoked bindings fail closed.

## CI

The existing CI now runs:

1. project structure
2. Prisma generation
3. CORE_BOUND gate
4. migrations
5. typecheck
6. lint
7. unit/integration tests
8. build
9. UGC 10x10 static release gate
10. isolated Postgres E2E with Chromium

Vercel deployment is intentionally outside this gate.

## Status

Implementation: GREEN pending CI execution on the final head.

CI evidence: must be read from the GitHub workflow run for the final commit; no status is inferred from source inspection alone.

Vercel: intentionally BLOCKED by CarryOS release policy.
