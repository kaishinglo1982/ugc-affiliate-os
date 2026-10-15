# Workspace ownership source classification — 2026-10-15

**Status:** SOURCE_SCHEMA_AND_MIGRATION_RECONCILIATION_COMPLETE; LIVE_CLASSIFICATION_BLOCKED  
**Repository:** `kaishinglo1982/ugc-affiliate-os`  
**Branch:** `fix/rls-transaction-bound-workspace-context`  
**Purpose:** Record schema-derived ownership classes and migration/RLS coverage without assuming either excluded Neon project is canonical.

## 1. Target decision and live evidence

The user explicitly excluded both `neon-emerald-tree` and `neon-champagne-car` as the canonical UGC database. They must not be used for data classification or writes.

Read-only discovery across the connected Neon account found:
- `carryos-production` has no `Product` table and its inventory is Core-oriented, not UGC.
- `neon-emerald-house` and `neon-sky-dog` have no matching UGC model tables.
- The two excluded projects both had latest successful migration `20260714100210_phase3_4_foundation`; this is not a valid target signal because the user excluded them.

Therefore no canonical UGC database is currently identified. Live ownership conflicts, orphan counts, and row-level classifications remain **NOT ASSESSED**. No data/schema/RLS writes were performed.

## 2. Prisma model inventory

Current `prisma/schema.prisma` on this branch contains **126 models**:
- **102 models** declare a direct `workspaceId`.
- **24 models** do not declare a direct `workspaceId`.
- **78 of the 102 direct-workspace models** still have a sentinel default `00000000-0000-0000-0000-000000000001`. That default is not ownership evidence and must not be treated as a safe tenant assignment for existing rows.
- The other 24 direct-workspace models without that sentinel default are exactly the models listed in the existing RLS groundwork migration.

### 2.1 Models with no direct workspace field — required ownership decision

| Model(s) | Classification recommendation | Required rule before RLS |
|---|---|---|
| `User`, `Session` | Global identity/authentication | Authorize user/session first; tenant membership must be explicit and not inferred from a token UUID alone |
| `ContactRequest` | Potential global inbound form data | Confirm whether this is public/global intake or tenant-owned support data; apply separate access policy |
| `ProductScore` | Child of `Product` | Inherit through a validated Product FK; test orphan and cross-workspace references |
| `AffiliateProgram` | **Ambiguous mixed model**: provider identity plus tenant-specific tracking ID, credentials, status, notes and custom name | Split global provider/catalog metadata from workspace-owned account/configuration; do not classify the entire model as global |
| `AffiliateLink`, `LinkClick` | Tenant runtime data | Ownership through program/product; validate both parents agree and scope click reads/writes via link |
| `Campaign` | Tenant runtime data | Add explicit workspace ownership or enforce a fully validated parent-based invariant; nullable parents make inference incomplete |
| `Script`, `ScriptVersion` | Tenant content / child records | Script inherits from Campaign/Product only where unambiguous; ScriptVersion inherits from Script |
| `VideoJob`, `MediaAsset` | Tenant runtime / storage metadata | Direct workspace ownership preferred for queue/storage access; validate all optional parent references and storage-key access |
| `SocialAccount` | Tenant-owned external account connection | Direct workspace ownership; credential must be in the same workspace |
| `SocialPost`, `PublishJob` | Tenant publishing data / child queue | Ownership via SocialAccount and post; validate cross-parent consistency; worker queries must be tenant-scoped |
| `TaxSetting` | Tenant-specific finance configuration | Add workspace ownership and a uniqueness/cardinality rule (normally one setting set per workspace); current one-row observation in excluded projects is not canonical evidence |
| `Integration` | Tenant-specific integration configuration; provider definitions should be separate | Direct workspace ownership for runtime config; do not mix global provider catalog with workspace secrets/status |
| `EncryptedCredential` | Tenant-owned secret material | Direct workspace ownership, authorization on every read/use/rotation, and same-workspace FK constraints for all consumers |
| `Agent` | Mixed global agent definition and tenant runtime state | Split immutable/global agent definitions from workspace agent instances/configuration/status/counters |
| `AgentRun` | Tenant runtime execution record | Inherit from a workspace-owned agent instance; workers and logs must preserve tenant context |
| `Automation` | Tenant-owned automation configuration | Direct workspace ownership; authorization on schedule and action mutation |
| `AutomationRun` | Tenant runtime execution record | Inherit from automation; worker must scope by workspace |
| `Notification` | Tenant-owned user-facing data | Direct workspace/user ownership and scoped list/read/update operations |
| `AuditLog` | Tenant-aware audit data | Add workspace context for tenant actions; define separate access to global security/admin events |

Parent-based ownership alone is insufficient where parent FKs are nullable, multiple parents can disagree, or background workers query by status without a tenant predicate. Any orphan, conflicting parent ownership, or ambiguous record must be quarantined for manual review, not automatically assigned.

## 3. Migration and Prisma schema drift

The repository currently lists these migration directories after `20260714100210_phase3_4_foundation`:
1. `20260716233000_phase10_workflow_versioning`
2. `20260717001000_phase10_workflow_step_claiming`
3. `20260717001500_phase10_agent_capacity`
4. `20260717010000_phase10_tool_execution_gateway`
5. `20260922050000_workspace_rls_policy_groundwork`
6. `20260924144000_workspace_ownership_credentials_integrations`
7. `20261002070000_schema_sync_creative_brief`
8. `20261014140000_finance_workspace_scope`

The two excluded databases had not applied those later migrations. This explains why their observed live schema lacks the current Prisma `Revenue.workspaceId` and `Expense.workspaceId`, but does not make either database canonical.

Additional repository-level drift must be resolved:
- `20260924144000_workspace_ownership_credentials_integrations/migration.sql` adds `workspaceId` to `EncryptedCredential` and `Integration`, but the current Prisma models for both still have no `workspaceId` field. Reconcile by editing the schema or replacing the migration in a new additive correction; do not guess which representation is intended.
- `20261014140000_finance_workspace_scope/migration.sql` adds non-null `workspaceId` to Revenue/Expense with the sentinel as a default and adds indexes. This is mechanically additive, but the default cannot establish true ownership for pre-existing rows.
- Several other models have a sentinel default even though their records may be global definitions, tenant configuration, or runtime state. Model-by-model semantics must be approved before treating this default as valid ownership.

## 4. RLS groundwork coverage

The migration `20260922050000_workspace_rls_policy_groundwork` creates **24 workspace isolation policies**:
Brand, Niche, ContentAsset, AnalyticsEvent, PlatformMetricSnapshot, AnalyticsSyncJob, AnalyticsProviderMapping, ContentIntelligenceProfile, ContentVariant, ContentPerformanceSnapshot, ProductPerformanceSnapshot, PostingTimePerformance, ContentExperiment, ExperimentVariant, ExperimentAssignment, ExperimentResult, OptimizationRecommendation, OptimizationPolicy, AudienceSegment, DataQualityReport, DataQualityIssue, AnalyticsAnomaly, OptimizationRule, OptimizationRuleExecution.

Compared with the current schema's 102 direct-workspace models:
- **24/102** have a policy in this groundwork migration.
- **78/102** have no policy in this migration.
- The migration contains **zero** `ENABLE ROW LEVEL SECURITY` statements and **zero** `FORCE ROW LEVEL SECURITY` statements. This is groundwork only; RLS is not activated by this migration.

This coverage comparison is not a full live policy audit. Before any activation, query `pg_class.relrowsecurity`, `pg_class.relforcerowsecurity`, `pg_policies`, role attributes, and effective grants on the confirmed target, and reconcile them with the exact migration head.

## 5. Safe migration design gates

No backfill SQL should be authored as an executable production migration until all of these are complete:

1. **Canonical target:** identify the actual UGC project, branch, database, and expected deployment environment.
2. **Schema parity:** compare deployed columns, constraints, indexes, enum values, foreign keys, and `_prisma_migrations` against the exact repository commit.
3. **Ownership semantics:** approve global catalog vs tenant-owned runtime classification, including AffiliateProgram, Integration, Agent, credentials, TaxSetting, AuditLog and notifications.
4. **Read-only row classification:** report exact counts for sentinel/default values, nulls, duplicate ownership candidates, conflicting parent owners, missing parents, orphaned children, and cross-workspace FK edges. Never expose credential plaintext/ciphertext in reports.
5. **Quarantine rules:** rows without exactly one supported owner remain unresolved; do not silently assign them to a workspace.
6. **Additive migration plan:** add ownership fields/constraints/indexes and reversible, idempotent staging only; separate classification/backfill from enforcement.
7. **Disposable branch test:** test migration and backfill on a disposable Neon branch, including rollback/replay and large-table lock/latency behavior.
8. **Application coverage:** migrate server actions, routes, analytics/dashboard, direct SQL, queue workers, scheduled tasks, exports and admin paths; a transaction wrapper alone does not secure queries.
9. **Negative tests:** use a non-owner, non-`BYPASSRLS` role and prove workspace A cannot read/write workspace B rows in both directions; include missing context, mismatched parent FKs and worker execution.
10. **Separate RLS activation review:** enable/force RLS only after all preceding gates pass and policy coverage is complete. Keep PR #76 draft until then.

## 6. Current decision

- Schema-derived ownership classification: **COMPLETE FOR INITIAL TRIAGE; semantic review still required**.
- Canonical live target: **UNCONFIRMED**.
- Live conflicts/orphans/backfill counts: **NOT ASSESSED**.
- Executable backfill: **NOT AUTHORIZED / NOT PREPARED**.
- RLS activation: **BLOCKED**.
- PR #76: **DRAFT / UNMERGED**.
- CI/typecheck/PostgreSQL negative tests: **NOT RUN in this pass** to avoid spend before the schema/target gates are satisfied.

No database rows, schema, roles, policies, or production resources were changed while preparing this report.
