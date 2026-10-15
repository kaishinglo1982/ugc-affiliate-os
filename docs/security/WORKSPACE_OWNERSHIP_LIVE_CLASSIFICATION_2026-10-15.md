# Live workspace ownership classification — Neon discovery

**Status:** READ-ONLY CLASSIFICATION COMPLETE FOR TWO CANDIDATE PROJECTS; CANONICAL TARGET UNCONFIRMED  
**Repository:** `kaishinglo1982/ugc-affiliate-os`  
**Checked:** 2026-10-15  
**No writes performed:** no backfill, schema change, RLS change, or migration was executed.

## 1. Candidate Neon projects

The connected Neon account exposes two projects whose `public` schema matches the UGC Affiliate OS table family:

| Project | Project ID | Default branch ID |
|---|---|---|
| `neon-emerald-tree` | `mute-violet-93639974` | `br-raspy-surf-av2dyt97` |
| `neon-champagne-car` | `autumn-cherry-83365993` | `br-crimson-breeze-atdpg4h6` |

Both use database `neondb`, contain `public."_prisma_migrations"`, `public."Product"`, and no `public."Workspace"` table. Both have the same latest successfully applied migration name, `20260714100210_phase3_4_foundation`, but different completion timestamps. Their core table counts are identical. These similarities do not prove which is canonical or production. Do not write to either until the owner confirms the intended target.

## 2. Live read-only counts

The following counts were queried directly from both projects. They are row counts, not estimates.

| Table | neon-emerald-tree | neon-champagne-car |
|---|---:|---:|
| Product | 0 | 0 |
| Revenue | 0 | 0 |
| Expense | 0 | 0 |
| AffiliateOffer | 0 | 0 |
| AffiliateOfferSnapshot | 0 | 0 |
| Campaign | 0 | 0 |
| AffiliateLink | 0 | 0 |
| AffiliateProgram | 0 | 0 |
| EncryptedCredential | 0 | 0 |
| TaxSetting | 1 | 1 |

### Classification interpretation

- **Conflicting ownership candidates:** 0 observed among these rows because the checked core tables are empty.
- **Orphaned ownership records:** 0 observed among these rows because the checked core tables are empty.
- **Rows needing ownership backfill:** no eligible rows in the checked core tables; all have zero rows.
- **Unresolved tenant ownership:** one `TaxSetting` row in each candidate project; the model has no `workspaceId`, and its business semantics/cardinality must be confirmed before assigning an owner.
- **Not assessed by these counts:** all other tenant-runtime tables, relation integrity beyond the checked tables, application query paths, and the actual production target.

Do not interpret the zero row counts as proof that the two databases are interchangeable or that RLS is ready to activate.

## 3. Live schema drift found

The checked database schema differs from the current Prisma schema/ownership plan:

- `Product` has a `workspaceId` text column, defaulting to sentinel `00000000-0000-0000-0000-000000000001`.
- `AffiliateOffer` has a `workspaceId` text column with the same sentinel default.
- `AffiliateOfferSnapshot` has a `workspaceId` text column with the same sentinel default.
- **`Revenue` has no `workspaceId` column in the live database.**
- **`Expense` has no `workspaceId` column in the live database.**

The last two findings are a schema/migration drift blocker: a backfill or RLS policy drafted against the current Prisma model cannot be assumed to run against this live schema. Reconcile migration history and deployment target first. No SQL was run that changed schema or data.

## 4. Required next steps

1. Confirm which project/branch is the canonical UGC Affiliate OS database. Do not infer production from the project name alone.
2. Compare all deployed columns and `_prisma_migrations` records with the repository's migrations; identify why `Revenue.workspaceId` and `Expense.workspaceId` are absent.
3. Expand read-only classification to all tenant-sensitive tables and validate all parent relations, especially credentials and social/media runtime state.
4. Review the classification before creating an additive migration.
5. Test backfill on a disposable Neon branch, then run PostgreSQL cross-workspace negative tests using a non-owner, non-`BYPASSRLS` role.
6. Activate RLS only in a separate reviewed migration after app query paths, write paths, tests, and schema drift are resolved.

PR #76 remains draft and unmerged. No CI was triggered by this read-only investigation.
