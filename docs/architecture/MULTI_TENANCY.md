# Multi-Tenancy and Workspace Isolation

## Canonical model

`Workspace` is the tenant boundary. `WorkspaceMember` grants a user an explicit role and lifecycle status in one workspace. The legacy fixed workspace id remains as the migration-safe default tenant until all application entrypoints resolve workspace membership explicitly.

## Mandatory database contract

Every tenant-scoped database operation must run inside `withWorkspaceTransaction()`.

The transaction sets:

- `app.current_workspace_id`;
- `app.current_user_id`;
- `app.bypass_rls` (`off` by default).

PostgreSQL row-level security reads this transaction-local context. Missing context fails closed because `app_current_workspace_id()` returns `NULL`.

## RLS policy

The migration enables and forces RLS on every existing table containing a `workspaceId` column. Both reads and writes require the row's workspace to match the active transaction workspace.

Administrative bypass is explicit, transaction-local and forbidden for request handlers. It is reserved for reviewed maintenance, migration and recovery processes.

## Application rules

1. Never accept `workspaceId` as trusted authorization evidence.
2. Resolve the authenticated user first.
3. Verify an active `WorkspaceMember` record.
4. Start a workspace transaction.
5. Perform every related query through the provided transaction client.
6. Never mix Prisma/global-pool queries with tenant transaction queries in the same operation.
7. Background jobs must carry immutable workspace and correlation context.
8. Cross-workspace identifiers must return not-found or access-denied without revealing foreign metadata.

## Rollout sequence

1. Add Workspace and WorkspaceMember persistence plus RLS foundation.
2. Reconcile these entities into `schema.prisma`.
3. Backfill the owner membership for the existing administrator.
4. Introduce request and worker workspace resolvers.
5. Migrate repository/services to mandatory workspace transactions.
6. Remove fixed `workspaceId` defaults from domain models.
7. Add non-superuser PostgreSQL integration tests for cross-tenant reads and writes.
8. Add an architecture scanner that rejects unscoped queries in tenant domains.

## Acceptance target

Multi-tenancy is 10/10 only when:

- every tenant table has RLS enabled and forced;
- every request and worker operation establishes context;
- no production query bypasses the scoped transaction boundary;
- cross-workspace read, insert, update and delete tests fail correctly;
- privileged bypass has a separate credential and audit trail;
- fixed workspace defaults are removed after migration;
- backup, export and deletion operations preserve workspace scope.
