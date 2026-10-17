# Workspace RLS Gap Audit — 2026-10-18

## Scope and evidence

Static source audit of the current `master` branch:
- `prisma/schema.prisma` (126 Prisma models; blob SHA `92370cc917a9eec2e9e0c244268d851f016db810`)
- All 14 checked-in `prisma/migrations/*/migration.sql` files.
- This was a source inspection only. The migration chain was **not** applied to PostgreSQL, and no runtime isolation test was run.

## Findings

1. **Workspace ownership is wider than the current policy inventory.** 102 schema models declare a `workspaceId` field. The checked-in migrations contain 24 distinct `CREATE POLICY` table targets. These sets do not match: 78 workspace-bearing models have no policy target in the checked-in migration SQL. This is an inventory gap, not by itself proof every one of those tables should already be protected by RLS; classify each model and its access paths before rollout.
2. **RLS is not activated by the checked-in migration chain.** No migration contains `ENABLE ROW LEVEL SECURITY` or `FORCE ROW LEVEL SECURITY`. Policy creation alone does not enforce tenant isolation.
3. **Schema/migration drift needs reconciliation.** Static table-creation scanning found 43 workspace-bearing models in the Campaign Factory / Media Production area without a corresponding `CREATE TABLE` or `ADD COLUMN workspaceId` statement in the checked-in migration SQL. The current migration history therefore does not establish that all those schema models exist in a newly migrated database. Confirm this with Prisma migration validation and a clean database; do not infer runtime state from source alone.
4. **PR #60's completion migration is not on current master.** Its proposed migration path needs to be reconciled with the current master migration history before review; do not cherry-pick the stale branch blindly.

## Required release gate

Do not enable or force RLS as a blanket change until all steps below pass:

1. Reconcile `schema.prisma` with the complete ordered migration history; verify all schema models/tables are intentionally present.
2. Build a per-table inventory: workspace ownership source, parent/foreign-key ownership, policies, application read/write paths, and explicit exclusions.
3. Apply the complete migration chain to a fresh PostgreSQL instance using the project's supported PostgreSQL version. Run `prisma migrate deploy` and schema-drift checks; capture actual results.
4. Execute integration tests using a non-owner, non-superuser, non-`BYPASSRLS` database role:
   - no workspace context: reads return no tenant rows and writes fail closed;
   - workspace A cannot read or mutate workspace B rows;
   - inserts and updates cannot assign a foreign workspace ID;
   - cross-workspace foreign-key references are rejected;
   - test SELECT, INSERT, UPDATE, and DELETE, including transactions and connection reuse.
5. Confirm every intended tenant table is covered by an appropriate policy and that application transactions set the trusted workspace context. Only then propose a separately reviewed RLS activation migration.

## Inventory summary

| Check | Static result |
| --- | ---: |
| Prisma models | 126 |
| Models declaring `workspaceId` | 102 |
| Distinct tables targeted by `CREATE POLICY` | 24 |
| Migration statements enabling RLS | 0 |
| Migration statements forcing RLS | 0 |
| Workspace models not matched to a policy target | 78 |
| Workspace models without detected table creation or workspaceId-addition migration | 43 |

These counts are a triage signal. They do not replace a live PostgreSQL migration test or per-model ownership review.
