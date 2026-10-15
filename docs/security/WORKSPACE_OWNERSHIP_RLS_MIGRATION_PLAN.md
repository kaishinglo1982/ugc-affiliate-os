# Workspace ownership and RLS rollout plan

Status: investigation only; no schema migration, data backfill, RLS activation, merge, deployment, or CI run performed.
Scope: draft PR #76 on `fix/rls-transaction-bound-workspace-context`.

## Executive finding

The current Prisma schema has no `Workspace` model. `Product`, `Revenue`, `Expense`, `AffiliateOffer`, and some analytics snapshot models contain a `workspaceId` string, but several have a hard-coded default UUID. This is not a relational ownership model by itself: there is no Workspace foreign key visible in the schema, and defaulting newly created tenant data to one sentinel workspace risks assigning records to the wrong tenant.

The following models have no direct workspace field in the current schema:
- Finance/configuration: `TaxSetting`, `AffiliateProgram`, `EncryptedCredential`
- Campaign/affiliate: `Campaign`, `AffiliateLink`, `LinkClick`
- Publishing/content: `SocialAccount`, `SocialPost`, `Script`, `VideoJob`, `MediaAsset`
- Other operational state observed in dashboard reads: `Integration`, `Agent`, `AuditLog`

This list is an initial high-priority set, not a complete schema inventory. Ownership may be derived through parent relations for some records, but such joins must be explicit and consistently enforced before RLS is enabled.

## Evidence from current branch

- `prisma/schema.prisma` at investigation time: `92370cc917a9eec2e9e0c244268d851f016db810`
- `src/server/services/finance.ts`: `TaxSetting` uses unscoped `findFirst/create`; revenue and expense lists are workspace-filtered and transaction-bound.
- `src/app/app/finance/page.tsx`: direct reads remain for `AffiliateProgram`, `Product`, and `Campaign`; `getOrCreateTaxSetting()` is unscoped.
- `src/server/services/analytics.ts`: multiple direct global Prisma reads for `Campaign`, `LinkClick`, `Revenue`, `Expense`, and `SocialPost`. User-supplied filter IDs are used in lookups without first proving they belong to the authenticated workspace. Query predicates alone do not establish RLS context.
- `src/server/services/dashboard.ts`: direct reads aggregate finance, clicks, posts, campaigns, video jobs, audit logs, scheduled posts, integrations, agents, scripts, and statuses without a workspace parameter or transaction context.
- Draft PR #76 remains open and unmerged. No validation claim is made.

## Safe ownership design

### 1. Define workspace identity before adding columns

1. Identify the actual authentication/session source of workspace membership and whether more than one workspace is supported per user.
2. Decide whether a canonical `Workspace` table is needed. If adopted, add stable IDs and foreign keys only after mapping existing identifiers and sentinel/default usage.
3. Remove tenant-owned model defaults that silently assign the sentinel workspace. New tenant-owned writes must receive an authorized workspace ID from server-side context.
4. Distinguish true global reference data (for example, a curated provider catalog, if the product requires one) from tenant configuration (provider credentials, tracking IDs, account status, custom labels). Never use a global row to store a customer's credentials or mutable integration state.

### 2. Per-model ownership and backfill

- `TaxSetting`: make settings workspace-specific, with a uniqueness constraint per workspace (or one row per workspace). Do not copy the current singleton to every workspace until the intended business semantics and existing users are confirmed. Preserve the current row and create a reviewed mapping/backfill.
- `AffiliateProgram`: determine whether rows are global provider definitions or tenant-specific program connections. Current fields such as `trackingId`, `credentialId`, `status`, `notes`, and `customName` indicate that connected/configured records are tenant data. Prefer separating provider catalog metadata from workspace-owned connection/configuration records, or explicitly scope the model per workspace.
- `EncryptedCredential`: credentials must be tenant-scoped or provably owned through a tenant-scoped parent. Audit every reference from affiliate programs, social accounts, and integrations; reject cross-workspace credential references.
- `Campaign`: add direct workspace ownership or use a rigorously enforced parent ownership design. Backfill candidates can be derived from `product.workspaceId`, associated `Revenue.workspaceId` / `Expense.workspaceId`, and linked affiliate program/link ownership. If these sources disagree or are absent, quarantine the row for explicit review; never choose a workspace arbitrarily.
- `AffiliateLink` and `LinkClick`: resolve ownership from the owning program and/or product only after their ownership is validated. Ensure clicks inherit ownership through a constrained link relation or receive an explicit workspace field; avoid accepting tenant identity from event payloads.
- `SocialAccount`, `SocialPost`, `Script`, `VideoJob`, `MediaAsset`: establish workspace ownership consistently. Derive child ownership from validated parent relations where safe; block mismatched workspace references on create/update.
- `Integration`, `Agent`, `AuditLog`: decide which rows are global definitions versus tenant-specific runtime state. Mutable configs, errors, runs, and tenant audit records must not be globally readable. Keep platform-level catalog definitions separate from tenant execution state if necessary.

### 3. Backfill process (must be reviewed before execution)

1. Add nullable ownership columns and indexes in an additive migration; do not immediately add a sentinel default or enforce NOT NULL.
2. Run read-only classification queries to count rows that are unambiguous, ambiguous, orphaned, or conflicting across parent ownership.
3. Produce a deterministic mapping table/review artifact for every existing tenant-owned row.
4. Backfill only unambiguous rows using explicit parent relationships and verified workspace mappings.
5. Stop the migration if any conflict remains in rows that must be tenant-owned. Resolve ambiguous rows manually or move them to a controlled quarantine/archive path with an approved retention plan.
6. Verify row counts, orphan counts, cross-workspace relation counts, uniqueness, and foreign-key consistency before enforcing NOT NULL/FKs.
7. Remove unsafe defaults and add constraints only after the application always supplies authorized ownership.
8. Do not run this backfill against production as part of this draft.

## Dashboard and Analytics access-path findings

### Analytics

`getAnalyticsData()` must accept a server-resolved `workspaceId`, and the whole tenant-owned read set should use one `withWorkspaceTransaction(workspaceId, tx => ...)` callback. Add explicit workspace constraints where the model supports them; for related models without a direct field, use validated ownership relations until their schema migration lands. Resolve `campaignId`, `productId`, and `programId` filters against the authenticated workspace before querying dependent metrics. A foreign-workspace filter should fail closed or return the product's chosen not-found response, not broaden results.

Current unscoped reads include campaign lookup, click lookup, revenue, ad-spend aggregation, social-post metrics, and status grouping. The service currently does not accept workspace context.

### Dashboard

`getDashboardData()` must accept a server-resolved `workspaceId` and transaction-bind its database reads. Finance rows need explicit workspace filters. Clicks, social posts, campaigns, video jobs, scripts, audit activity, integrations, and agent state need schema-backed ownership or a documented global-definition/tenant-state split. Do not merely wrap current unscoped queries in a transaction: that would set context but would not constrain records until matching RLS policies and ownership relations exist.

### Finance page

The direct `Product` read should be filtered by the resolved workspace. `AffiliateProgram`, `Campaign`, and `TaxSetting` should remain blocked from being treated as tenant-safe until their ownership design/backfill is complete. The existing finance export joins campaign/program labels; validate those related records cannot leak another workspace's names/configuration.

## Required validation gates before RLS

1. Schema inventory for every model with tenant-owned data and every relation to it.
2. Backfill dry-run report: no unclassified ownership conflicts, no orphaned tenant-owned records.
3. Direct-access scan across server pages, services, route handlers, server actions, workers, queues, agents, exports, and scheduled jobs.
4. API/service tests for workspace A versus B across SELECT/INSERT/UPDATE/DELETE and invalid foreign keys.
5. Real PostgreSQL integration tests using a non-owner, non-`BYPASSRLS` application role; include raw SQL and Prisma transaction paths.
6. Verify `app.current_workspace_id` is set on the same transaction and that RLS policies use the same setting name.
7. Verify schema/policy coverage from the actual migrated database, not only source files.
8. Enable `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY` only in a separate reviewed migration after all previous gates pass.

## Current decision

Keep PR #76 in Draft. Continue with schema-aware ownership design and a read-only access-path inventory first. Do not enable RLS, run a data backfill, merge, or deploy based on the present evidence.
