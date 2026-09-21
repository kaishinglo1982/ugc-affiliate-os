# Schema / migration drift — production gate

Last verified during PR #49 production-readiness audit on 2026-09-13.

`prisma/schema.prisma` and the applied migration history (`prisma/migrations/`)
have historically drifted in both directions. CI now applies migrations on a
fresh PostgreSQL database and runs build + E2E, but that only proves the paths
covered by the current test suite. It does not prove that every model declared
in the Prisma schema has a corresponding migration or that every raw-SQL-owned
column/table is represented in the Prisma schema.

## Already addressed on the current integration path

- Workflow versioning columns used by `WorkflowDefinition`,
  `WorkflowStepDefinition`, and `WorkflowRun` are represented by the current
  schema/integration work.
- The ContentBrief migration required by the current E2E flow is present and
  applies cleanly on a fresh CI database.
- PR #49 CI currently validates migration deploy, Prisma generation,
  TypeScript, ESLint, unit/integration tests, production build, and Playwright.

## Remaining production blockers

### 1. Campaign Factory / Media Production schema declarations without full migration coverage

A prior deliberate `prisma migrate diff --from-migrations ./prisma/migrations --to-schema ./prisma/schema.prisma --script`
audit found roughly 43 Campaign Factory / Media Production tables and roughly
59 enums declared in `schema.prisma` without matching migration history. Examples
include `CreativeAngle`, `CampaignStrategy`, `ContentBatch`, `RenderJob`,
`MediaTimeline`, `SubtitleTrack`, and `MediaQualityPolicy`.

Do not generate and apply a blind diff. First decide which schema declarations
are still part of the intended product surface, then create an additive,
reviewed migration for the retained models. Any generated `DROP TABLE`,
`DROP COLUMN`, or enum contraction is a hard review stop.

### 2. Workflow step-claiming / agent-capacity database structures not fully represented in Prisma

Raw-SQL runtime paths such as `src/lib/workflows/postgres-step-claim.ts` and
`src/lib/agents/postgres-capacity-router.ts` use workflow claim/lease fields and
agent-capacity structures that have historically existed in the database layer
without complete Prisma-schema representation. A naive schema diff can therefore
propose destructive removal of still-used database structures.

Before any migration is generated, reconcile the Prisma schema with the actual
runtime contract for:

- workflow claim token / claimedBy / heartbeat / lease expiry
- max attempts / next attempt / step state / version
- `AgentCapabilityRegistration`
- `AgentCapacityReservation`

### 3. Tenant persistence is not yet uniformly enforceable at the database layer

The CarryOS binding in PR #49 resolves and validates the tenant/workspace at the
request boundary, and newer models already contain `workspaceId`. Several older
core models (for example Campaign, Script, VideoJob and related legacy roots)
do not yet have a direct workspace key. That prevents a safe blanket RLS rollout.

`FORCE ROW LEVEL SECURITY` must not be enabled until all tenant-owned roots are
workspace-addressable and database access runs inside a workspace-bound
transaction/session context. Enabling RLS earlier would either break legitimate
runtime paths or create a false sense of isolation around models that cannot be
scoped directly.

## Required order to close the gate

1. Reconcile intended schema vs. migration history; explicitly retain or retire
   the unmigrated Campaign Factory / Media Production models.
2. Represent still-used workflow step-claiming and agent-capacity structures in
   `schema.prisma` before producing any diff.
3. Add a direct `workspaceId` (or an equally strong immutable tenant key) to all
   tenant-owned root models and backfill existing rows to the standalone/default
   workspace.
4. Route tenant-owned Prisma access through a workspace-bound persistence
   context and add negative cross-workspace read/write tests.
5. Only then add PostgreSQL RLS policies and, after proving the application DB
   role does not bypass them, consider `FORCE ROW LEVEL SECURITY`.
6. Run migration deploy on a fresh database, schema-drift diff, unit/integration,
   build, and E2E again before the 10/10 merge gate.

## Safety rule

Never apply an auto-generated migration containing destructive SQL merely to
make `migrate diff` quiet. The runtime/raw-SQL contract and intended product
schema must be reconciled first.
