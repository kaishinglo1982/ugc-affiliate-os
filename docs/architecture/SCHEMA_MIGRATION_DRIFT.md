# Known schema/migration drift (found 2026-09-01)

`prisma/schema.prisma` and the applied migration history (`prisma/migrations/`)
have drifted apart in both directions. This was undetected until now because
CI's E2E job never ran (see PR #44 for the CI-outage story) — the first real
E2E run surfaced two concrete failures, both fixed in this PR:

- `WorkflowDefinition`/`WorkflowStepDefinition`/`WorkflowRun` were missing the
  versioning columns (`key`, `version`, `definitionHash`, `activatedAt`,
  `supersededAt`, `dependsOn`, `workflowVersion`, `definitionSnapshot`,
  `correlationId`, `idempotencyKey`) that migration
  `20260716233000_phase10_workflow_versioning` already added to the database
  and that `src/lib/workflows/postgres-adapter.ts` already reads/writes via
  raw SQL. The typed Prisma Client didn't know about them, so
  `prisma.workflowDefinition.create()` (used by `POST /api/workflows`) failed
  every single call with a `NOT NULL` violation on `key`.

## Not fixed here — documented for a deliberate follow-up

Running `prisma migrate diff --from-migrations ./prisma/migrations --to-schema ./prisma/schema.prisma --script`
surfaces two more areas of drift, left untouched in this PR because they are
large and/or would need a `DROP TABLE`/`DROP COLUMN` in an auto-generated
migration — not something to apply without deliberately deciding which side
(schema vs. database) is the source of truth:

1. **Campaign Factory / Media Production tables never migrated.**
   `schema.prisma` declares ~43 tables and ~59 enums (`CreativeAngle`,
   `CampaignStrategy`, `ContentBatch`, `RenderJob`, `MediaTimeline`,
   `SubtitleTrack`, `MediaQualityPolicy`, …) that no migration ever created.
   This is what caused the second E2E failure category
   (`column ContentBrief.campaignStrategyId does not exist`) — `ContentBrief`
   itself exists, but its "Phase 8" extension columns and the tables they
   reference don't. Fixing this means generating (and carefully reviewing)
   a large `CREATE TABLE`/`CREATE ENUM` migration — additive only, but big
   enough to warrant its own PR and a real review of whether all 43 tables
   are still wanted.

2. **Workflow step-claiming and agent-capacity columns/tables are DB-only.**
   `src/lib/workflows/postgres-step-claim.ts` and
   `src/lib/agents/postgres-capacity-router.ts` read/write
   `WorkflowStepRun.claimToken/claimedBy/heartbeatAt/leaseExpiresAt/maxAttempts/nextAttemptAt/state/version`
   and the `AgentCapabilityRegistration`/`AgentCapacityReservation` tables via
   raw SQL, none of which `schema.prisma` declares. An auto-generated diff
   would propose **dropping** these tables/columns — do not apply such a
   diff without first adding the missing fields to `schema.prisma` (the same
   pattern used for the workflow-versioning fix in this PR), the same way
   `WorkflowRunStatus`'s extra enum values (`QUEUED`, `WAITING_FOR_APPROVAL`,
   `PAUSED`, `RETRYING`, `COMPENSATING`, added by
   `20260717001000_phase10_workflow_step_claiming`) were added to
   `schema.prisma` in this PR specifically to stop a diff from dropping them.

**Before generating any further migration from a `migrate diff`, read this
file and confirm which side (the already-running raw-SQL code, or
`schema.prisma`) reflects the real intended state — do not apply an
auto-generated migration containing `DROP TABLE`/`DROP COLUMN` without that
check.**
