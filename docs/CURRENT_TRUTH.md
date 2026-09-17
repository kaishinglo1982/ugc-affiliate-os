# UGC Affiliate OS — Current Truth

**Last verified:** 2026-09-12  
**Default branch:** `master`  
**Authority:** current GitHub state, open PRs and exact-head CI.  
**Rule:** If this file conflicts with older UGC roadmaps, handoff notes or chat transcripts, this file is the current planning authority until superseded by a newer verified update.

## Hard release rules

- No Vercel Production deployment before the global CarryOS Universe GitHub 10/10 gate.
- In `CORE_BOUND`, CarryOS is the authority for shared runtime, model/provider routing, generic agents, tool governance, audit, FinOps and evaluation.
- UGC owns UGC/affiliate/fashion domain logic, workflows, skills and real domain specialists.
- No caller-controlled tenant/workspace authority.
- No secrets in Git. No untyped `any` in new or changed TypeScript.
- No fake KPI, fake provider success or dead production actions.

## Verified current state

The current default branch is still behind the main integration work. Important production-readiness work lives in open PRs and must be consolidated deliberately rather than merged blindly in arbitrary order.

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

#### PR #44

- tenant/governance consolidation
- cost envelope
- single-use approval token
- BYOK validation
- credential health/rotation

#### PR #46

- workflow schema/migration drift alignment
- documents larger remaining drift

#### PR #47

- seven canonical UGC Affiliate automation process templates

#### PR #48

- Creator Revenue OS service authentication bridge
- transitional service auth currently tied to local workspace assumptions and must migrate to the final tenant-bound ServicePrincipal model

#### PR #43

- removes generic duplicate agents
- generic research/content/social/workflow responsibilities belong in CarryOS

#### PR #42

- provider-neutral AI routing/offline baseline
- must not become a production provider bypass in CORE_BOUND

## Confirmed remaining blockers

1. Formal tenant-owned persistence isolation is not yet complete.
2. Final transaction/workspace-bound DB context is required before `FORCE RLS` can be treated as production-safe.
3. Campaign Factory / Media Production schema has larger migration drift, including many declared tables not represented by complete migration history.
4. Workflow step-claiming / agent-capacity schema drift remains.
5. Direct provider/LLM paths must be fully governed by CarryOS in CORE_BOUND production mode.
6. Creator Revenue S2S must migrate to the shared tenant-bound ServicePrincipal model.
7. Current Playwright E2E is red.

## Execution roadmap

### Phase UGC-0 — one consolidation line

Create and maintain one release/consolidation branch from current `master` and reconcile the useful parts of PRs #42, #43, #44, #46, #47, #48 and #49.

Do not merge overlapping PRs independently without verifying schema, auth and routing interactions.

### Phase UGC-10 — schema and migration truth

1. inventory Prisma schema vs applied migrations;
2. close Campaign/Media migration gaps;
3. align step-claiming/agent-capacity declarations;
4. prove empty-database migration replay;
5. prove upgrade migration path from current supported database state.

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
3. in CORE_BOUND route productive AI through CarryOS runtime/OmniRoute;
4. route governed tools through CarryOS Tool Fabric where applicable;
5. remove or fail-close direct provider bypasses.

### Phase UGC-40 — shared ServicePrincipal integration

After CarryOS generic ServicePrincipal exists:

1. bind UGC installation to CarryOS Tenant + PluginInstallation + ServicePrincipal;
2. migrate Creator Revenue bridge from transitional service token/workspace pinning;
3. propagate CarryExecutionContext into workflows/agents/tools;
4. bind audit/FinOps/evals to the authoritative tenant/execution identity.

### Phase UGC-50 — process/workflow consolidation

Verify the canonical UGC workflows:

- Product/Offer Research
- Campaign -> Briefing -> Script
- Asset Review -> Publishing
- Affiliate Attribution -> Analytics
- Performance Optimization
- Affiliate Link / Offer Integrity
- Multi-Brand / Multi-Account Operations

External side effects remain approval-gated.

### Phase UGC-60 — fix E2E and final 10/10

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
- Production Build
- backup/restore/rollback readiness

No P0/P1 blockers.

Still **no Vercel Production deployment** until the global CarryOS Universe 10/10 gate is green.

## Current critical path

`Schema/migration truth -> transaction-bound tenant persistence -> RLS -> CORE_BOUND governance -> ServicePrincipal -> Creator bridge -> E2E green -> UGC GitHub 10/10 -> wait for global Universe gate -> Vercel`
