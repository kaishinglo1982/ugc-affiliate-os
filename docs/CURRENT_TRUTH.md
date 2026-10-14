# UGC Affiliate OS — Current Truth

**Last verified:** 2026-09-30  
**Default branch:** `master`  
**Active hardening branch:** `fix/core-bound-tenant-uuid`  
**Authority:** current GitHub state, open PRs and exact-head CI.  
**Rule:** If this file conflicts with older UGC roadmaps, handoff notes or chat transcripts, this file is the current planning authority until superseded by a newer verified update.

## Hard release rules

- No Vercel Production deployment before the global CarryOS Universe GitHub 10/10 gate.
- In `CORE_BOUND`, CarryOS is the authority for shared runtime, model/provider routing, generic agents, tool governance, audit, FinOps and evaluation.
- UGC owns UGC/affiliate/fashion domain logic, workflows, skills and real domain specialists.
- No caller-controlled tenant/workspace authority.
- No secrets in Git. No untyped `any` in new or changed TypeScript.
- No fake KPI, fake provider success or dead production actions.

## 2026-09-30 CORE_BOUND AI execution hardening

On branch `fix/core-bound-tenant-uuid`:

- Tenant assertions now require a UUID before being accepted by the UGC tenant resolver.
- A negative test proves non-UUID tenant assertions are rejected.
- A governed CarryOS AI client now targets the canonical `POST /api/v1/plugins/ugc/execute` boundary.
- The client requires UUID tenant/correlation context and a configured CarryOS ServicePrincipal credential and contract version.
- A Core-backed ScriptProvider exists and derives tenant context from the authenticated UGC request context.
- The CORE_BOUND script-provider registry now selects that Core-backed provider instead of the local template provider.
- The local template provider therefore remains available only outside CORE_BOUND.
- Core response correlation IDs are checked before accepting generated content.

This is a real provider-boundary integration, but it does **not** close UGC-40 completely: the UGC inbound tenant assertion still uses the existing signed CarryOS tenant transport, and the final installation-bound ServicePrincipal/PluginInstallation lifecycle plus Creator Revenue migration remain open.

No production deployment is authorized by this change.

## Verified current state

The current default branch is still behind the main integration work. Important production-readiness work lives in open PRs and must be consolidated deliberately rather than merged blindly in arbitrary order.

### PR #63 — CORE_BOUND tenant assertion hardening

Implemented on `fix/core-bound-tenant-uuid`:

- strict UUID validation for the CarryOS tenant assertion;
- negative test for non-UUID tenant IDs;
- current hardening remains separate from final ServicePrincipal/PluginInstallation authority.

### PR #49 — CarryOS tenant to UGC workspace binding

Implemented:

- `CARRYOS_INTEGRATION_MODE=STANDALONE|CORE_BOUND`
- CarryOS Tenant UUID -> local Workspace binding
- signed CarryOS tenant assertion
- explicit workspace role bindings
- no implicit owner fallback in CORE_BOUND
- negative RBAC tests
- ContentBrief drift fix
- canonical workflow key/version
- TypeScript 6 compatibility
- Playwright selector updates

Latest audited CI:

- Validate job: GREEN
- migrations: GREEN
- typecheck: GREEN
- lint: GREEN
- unit/integration: GREEN
- build: GREEN
- E2E: FAIL

Therefore PR #49 is not merge-ready for 10/10 yet.

### Other relevant open work

#### PR #48

- Creator Revenue OS service authentication bridge
- transitional service auth currently tied to local workspace assumptions and must migrate to the final tenant-bound ServicePrincipal model

#### PR #44

- tenant/governance consolidation
- cost envelope
- single-use approval token
- BYOK validation
- credential health/rotation

#### PR #46

- workflow schema/migration drift alignment

#### PR #47

- seven canonical UGC Affiliate automation process templates

#### PR #43

- removes generic duplicate agents
- generic research/content/social/workflow responsibilities belong in CarryOS

#### PR #42

- provider-neutral AI routing/offline baseline
- must not become a production provider bypass in CORE_BOUND

## Confirmed remaining blockers

1. Formal tenant-owned persistence isolation is not yet complete.
2. Final transaction/workspace-bound DB context is required before `FORCE RLS` can be treated as production-safe.
3. Campaign Factory / Media Production schema has larger migration drift.
4. Workflow step-claiming / agent-capacity schema drift remains.
5. Direct provider/LLM paths outside the hardened Script Studio path must be fully governed by CarryOS in CORE_BOUND production mode.
6. Final UGC installation-bound ServicePrincipal/PluginInstallation lifecycle remains open.
7. Creator Revenue S2S must migrate to the shared tenant-bound ServicePrincipal model.
8. Current Playwright E2E is red.

## Execution roadmap

### Phase UGC-0 — one consolidation line

Create and maintain one release/consolidation branch from current `master` and reconcile useful work deliberately.

### Phase UGC-10 — schema and migration truth

1. inventory Prisma schema vs applied migrations;
2. close Campaign/Media migration gaps;
3. align step-claiming/agent-capacity declarations;
4. prove empty-database migration replay;
5. prove upgrade migration path.

**Gate:** Prisma schema, migration history and generated client describe the same runtime database contract.

### Phase UGC-20 — tenant/workspace persistence enforcement

1. keep CarryOS Tenant UUID distinct from local Workspace ID;
2. establish transaction-bound workspace DB context;
3. add RLS + FORCE RLS where safe;
4. add tenant/workspace-consistent relations and uniqueness;
5. run two-tenant/two-workspace negative CRUD tests.

**Gate:** no cross-workspace read/write/update/delete through Prisma, raw SQL or API routes.

### Phase UGC-30 — governance and provider boundary

1. integrate approval and cost-envelope gates;
2. integrate BYOK/credential health;
3. route productive AI through CarryOS in CORE_BOUND;
4. route governed tools through CarryOS Tool Fabric where applicable;
5. remove or fail-close direct provider bypasses.

### Phase UGC-40 — shared ServicePrincipal integration

1. bind UGC installation to CarryOS Tenant + PluginInstallation + ServicePrincipal;
2. migrate Creator Revenue bridge from transitional service token/workspace pinning;
3. propagate CarryExecutionContext into workflows/agents/tools;
4. bind audit/FinOps/evals to authoritative tenant/execution identity.

### Phase UGC-50 — process/workflow consolidation

Verify the canonical UGC workflows and keep external side effects approval-gated.

### Phase UGC-60 — final 10/10

Required green evidence:

- architecture check
- migrations
- typecheck
- lint
- unit/integration
- RLS/tenant isolation
- auth/RBAC
- approval/cost governance
- CarryOS contracts
- ServicePrincipal
- governed provider routing
- Creator Revenue contract
- Playwright E2E
- production build
- backup/restore/rollback readiness

No P0/P1 blockers.

Still **no Vercel Production deployment** until the global CarryOS Universe 10/10 gate is green.

## Workspace RLS completion gate — 2026-10-14

The current beta hardening branch adds a follow-up migration that discovers every public PostgreSQL table with a `workspaceId` column, enables and forces RLS, and applies both a same-workspace permissive policy and a restrictive same-workspace policy. The restrictive policy is intended to prevent an additional permissive policy from widening tenant access.

The CI RLS inventory test is wired into the Validate workflow after migrations. It checks the live catalog for all workspace-owned tables, requires RLS enabled and forced, requires both workspace-bound policies, and verifies the test role is neither superuser nor `BYPASSRLS`. Cross-workspace reads/writes remain covered by the existing Campaign/Revenue smoke test.

**Evidence status:** implementation is committed on the open PR branch; the new workflow step has not yet been confirmed by an exact-head CI run. Do not mark the beta RLS gate complete until that run passes.

