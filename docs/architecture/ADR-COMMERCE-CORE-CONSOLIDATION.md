# ADR: Commerce Core Consolidation

- Status: ACCEPTED (architecture boundary), IN PROGRESS (implementation)
- Date: 2026-08-17
- Related commit: `d261580` (`feat(commerce-core): add verified scoring attribution and profitability foundation`)
- Band: `Unassigned Commerce/Finance Foundation` — no existing band number is unambiguously correct; none is invented here.

## Problem statement

`src/lib/commerce-core/` was added and committed (`d261580`) as a standalone, framework-free
library: deterministic product scoring (`product-score.ts`), last-touch attribution
(`attribution.ts`), profitability math (`profitability.ts`), and provider-neutral contracts
(`providers.ts`). It is fully typechecked and unit-tested (45/45), but **it was written and
committed without checking the existing, already-productive implementations of the same
concerns**. A read-only audit (three parallel research passes over `src/lib/finance/`,
`src/features/products/`, `src/server/services/analytics.ts`, `src/lib/analytics/`,
`src/lib/recommendation/`, `src/lib/providers/`, `src/lib/workflows/`,
`src/server/services/agents.ts`, `prisma/schema.prisma`, and `prisma/seed.ts`) found:

- A live, API-wired product scoring engine already exists and is in production use.
- A live profitability estimator already exists, sharing commerce-core's exact version
  string, which is itself evidence the two were never meant to diverge into two truths.
- Two independent, non-authoritative ROAS/CTR/conversion-rate calculators already exist
  outside both of the above.
- No Prisma model exists yet to back commerce-core's attribution or provider-sync types —
  `attribution.ts` and `providers.ts` are gap-fills, not duplicates, but they are also not
  load-bearing today.
- `docs/architecture/DOMAIN_OWNERSHIP.md` and `architecture.config.mjs` already declare a
  target domain model (`products`, `finance`, `affiliate`, `analytics` as owned business
  domains) that `commerce-core` was not added to and does not fit into as a ninth domain.
- `scripts/check-project-structure.mjs` (`pnpm run architecture:check`) forbids the directory
  name `helpers` anywhere under `src/`; commit `d261580` introduced
  `src/lib/commerce-core/__tests__/helpers/`, which is a structural violation independent of
  this consolidation and is fixed as part of it (renamed to `fixtures/`).

Left as-is, `commerce-core` would become a second, competing implementation of product
scoring and profitability — exactly the "Parallelstruktur" that `AGENTS.md` and `CODEX.md`
forbid ("keine Parallelstrukturen erzeugen", "keine zweite Finance-Engine"). This ADR fixes
ownership boundaries before any further commerce-core code is wired into anything live.

## Existing implementations (Ist-Zustand)

| Concern | Existing implementation | Status |
|---|---|---|
| Product opportunity scoring | `src/features/products/application/core.ts:872-999` `scoreProductOpportunities()`, API `POST /api/products/opportunities/score`, persisted to `ProductOpportunity` + `ProductOpportunityScoreComponent` (`prisma/schema.prisma:2205-2255`) | **Productive, live-wired** |
| Pre-campaign profitability estimate | `src/features/products/domain/profitability.ts` `estimateProfitability()`, `PROFITABILITY_VERSION = "1.0.0"`, persisted to `ProductProfitabilityEstimate` (`prisma/schema.prisma:2180`) via `src/features/products/application/core.ts:811-860` `estimateProfitabilityForOffer()` | **Productive, live-wired** |
| Ad-hoc campaign ROAS/CTR/conversion rate | `src/server/services/analytics.ts:96-101` (inline, ad-spend based, no commission netting) | Productive, narrow scope |
| Versioned ratio metrics | `src/lib/analytics/metrics.ts` (CTR, conversion rate, `ROCS`, null-safe) | Productive, different naming family than commerce-core's EPC/CPA/ROAS |
| Authoritative revenue/expense/tax | `src/lib/finance/calculations.ts` `summarizeFinance()`, `estimateTaxReserve()` (Prisma `Decimal`, `Revenue`/`Expense` models) | **Productive**, but no `FinanceSummarySnapshot`/`TaxReserveEstimate` persistence yet and no EPC/CPA/commission-netting concept |
| Click/event ingestion | `src/lib/analytics/event.ts` (`AFFILIATE_CLICK`/`LINK_CLICK`/`CONVERSION`/`REFUND`/`CHARGEBACK`, idempotency dedup); Prisma `LinkClick` (`prisma/schema.prisma:233-241`, no clickId/dedup/lookback) | Productive ingestion, **no resolution/matching logic** |
| Attribution resolution (click→conversion matching) | None. No `Conversion`/`Commission`/`Payout`/`AttributionEvent` model exists anywhere in `prisma/schema.prisma`. | **Gap** — `commerce-core/attribution.ts` has no counterpart and no data to run on |
| Provider sync (programs/products/clicks/conversions/commissions/payouts) | `src/lib/providers/affiliate/registry.ts` (`ProductSourcePort`, product-lookup only, permanently mocked) | Narrower scope than `commerce-core/providers.ts`; no live adapter anywhere in the repo |
| Social publish | `src/lib/providers/social/types.ts` (`SocialProvider`, `publish()` only); `src/features/publishing/queue.ts` explicitly forces the mock ("Live adapters are intentionally out of scope") | Narrower scope than `commerce-core/providers.ts`'s `SocialPublisher`; no live adapter anywhere |

## Factual differences

- `scoreProductOpportunities()` and `commerce-core/product-score.ts` use **different signal
  sets and different output shapes** (workflow status `OpportunityStatus` vs. categorical
  `scale/test/watch/reject`). Full comparison: see Phase 3 report and
  `audit/SCORING_CONSOLIDATION_MATRIX.md`.
- `features/products/domain/profitability.ts` estimates profitability **before** a campaign
  runs, from research-time signals. `commerce-core/profitability.ts` computes profitability
  **from realized** commission/refund/chargeback/cost data. These are legitimately different
  calculations answering different questions — see Phase 4 report and
  `audit/PROFITABILITY_OWNERSHIP_MATRIX.md`. Sharing the identical version string
  `"1.0.0"` is coincidental naming, not evidence the calculations agree.
- `commerce-core/attribution.ts` (`resolveAttribution`) is strictly more capable than
  anything in production today — tenant isolation, dedup, click-id matching with optional
  link fallback, lookback window, currency normalization — but nothing in production
  persists the `ConversionEvent`/`TrackingTouch` shapes it expects.

## Ownership boundaries (binding)

| Domain | Owner (`DOMAIN_OWNERSHIP.md`) | Canonical entry point | Commerce Core's role |
|---|---|---|---|
| Product opportunity scoring | Product Platform (`products`) | `src/features/products/application/core.ts` `scoreProductOpportunities()` | Provides an alternative deterministic scoring **primitive** (`scoreProduct`) that Product Platform may adopt after the Phase 3 comparison is reviewed and accepted — it does not call itself, is not routed to by any API, and does not replace the existing function in this change. |
| Realized/authoritative finance (revenue, expense, cost, commission, tax, persisted finance truth) | Finance Platform (`finance`), Band 14 ("die EINZIGE Finanz-Engine des Universums") | `src/lib/finance/calculations.ts` `summarizeFinance()` / `estimateTaxReserve()` | Provides a **calculation primitive** (`calculateProfitability`) for campaign-level EPC/CPA/ROAS/net-commission math that Finance does not currently compute. Any authoritative number derived from it must be validated and persisted through the Finance layer — commerce-core never becomes a second source of financial truth. |
| Pre-campaign profitability estimation | Product Platform (`products`) | `src/features/products/domain/profitability.ts` `estimateProfitability()` | Out of scope for commerce-core; these answer different questions (see above) and are not merged in this ADR. |
| Attribution (click→conversion resolution) | Product Platform / Data Platform (`affiliate`, `analytics`), conceptually Band 13 | None today — this is a genuine gap | Provides the resolution **primitive** (`resolveAttribution`, `markConversionStatus`). May only become load-bearing after: Prisma data model migration, tenant-isolation enforcement at the persistence layer, idempotency, an audit-event contract, explicit reversal rules, and integration tests (see Phase 6 / attribution rules below). Until then it triggers no payout or commission change of any kind. |
| Provider contracts (affiliate sync, social publish) | Product Platform / Publishing Platform (`affiliate`, `publishing`) | `src/lib/providers/affiliate/`, `src/lib/providers/social/` (currently mock-only) | Provides normalized **contract types** (`AffiliateProvider`, `SocialPublisher`, error types) that the existing, narrower interfaces may adopt when live adapters are eventually built. No live adapter is implemented anywhere, including commerce-core. |

## Canonical entry points (binding, effective immediately)

1. Product scoring: `src/features/products/application/core.ts` `scoreProductOpportunities()`.
2. Authoritative finance: `src/lib/finance/calculations.ts` `summarizeFinance()` /
   `estimateTaxReserve()`.
3. Pre-campaign profitability: `src/features/products/domain/profitability.ts`
   `estimateProfitability()`.
4. Attribution resolution: none yet — no canonical entry point exists until the migration in
   "Cutover conditions" below is complete.

`src/lib/commerce-core/` is **not** a canonical entry point for any of the above. It is a
library of primitives that canonical entry points may choose to call.

## Forbidden parallel structures

- No API route, workflow definition, agent tool, or queue consumer may call
  `commerce-core/*` directly as a replacement decision path while a canonical entry point
  for the same concern exists. Only the canonical entry point's own implementation may adopt
  a commerce-core primitive internally, after review.
- `commerce-core/profitability.ts` output must never be summed, reported, or exposed as a
  second "profitability" or "financial summary" number alongside
  `summarizeFinance()`/`estimateProfitability()` results without an explicit reconciliation
  step. Two profitability numbers for the same entity without a documented reconciliation is
  the specific failure mode this ADR exists to prevent.
- `commerce-core` must never gain its own Next.js API route, its own workflow state machine,
  its own agent registration, or its own queue/cron consumer. It stays a pure `src/lib`
  dependency, consistent with `docs/architecture/PROJECT_STRUCTURE.md`'s platform/business/
  shared-domain model — it is infrastructure-shaped (primitives), not a domain owner.
- `commerce-core/attribution.ts` must never be wired to anything that changes a commission,
  payout, or conversion status in a persisted store until the Phase 6 conditions are met.

## Planned transition architecture

1. **Now (this ADR):** `commerce-core` exists as an unwired, tested primitives library.
   Nothing in production calls it. Ownership and boundaries are documented (this file) and
   compared against production (`audit/SCORING_CONSOLIDATION_MATRIX.md`,
   `audit/PROFITABILITY_OWNERSHIP_MATRIX.md`).
2. **Next (separate, reviewed change):** Product Platform decides, based on the scoring
   comparison matrix, whether `scoreProductOpportunities()` internally adopts
   `commerce-core/product-score.ts` as its scoring primitive (signal mapping documented,
   no information loss unaccounted for) or the comparison shows they must stay separate for
   a documented reason.
3. **Later (separate, reviewed change, requires schema migration):** If attribution
   resolution is to be productionized, Data Platform designs `ConversionEvent`/
   `TrackingTouch`/`AttributedConversion` persistence, tenant-isolation enforcement, and an
   audit-event contract (this ADR's Phase 6 contract is the starting shape). Only after that
   migration ships, ships with integration tests, and is reviewed by QA/Security
   (`DOMAIN_OWNERSHIP.md` rule: "Authentication, authorization, credentials, approvals,
   payments, publishing and external side effects require QA/Security review") may any
   consumer call `resolveAttribution` against real data.
4. **Later still:** If/when a live affiliate-provider or social-publish adapter is built, its
   author decides whether to implement the existing narrower interface
   (`ProductSourcePort`/`SocialProvider`) or `commerce-core/providers.ts`'s contracts, or
   reconciles the two. Not decided by this ADR.

## Cutover conditions

`commerce-core/product-score.ts` may become (part of) the canonical scoring path only when
**all** of the following hold:

- The Phase 3 signal-mapping matrix is reviewed and every semantic difference or information
  loss is either resolved or explicitly accepted in writing.
- `scoreProductOpportunities()`'s existing consumers and persisted `ProductOpportunity`
  records continue to work (backward-compatible or migrated with a plan).
- The approval-policy extension in Phase 5 is implemented and covers the new decision path.
- Product Platform (owner) and Data Platform (mandatory reviewer per
  `DOMAIN_OWNERSHIP.md`) approve the change.

`commerce-core/profitability.ts` may feed a persisted, authoritative number only when:

- Its output is passed into `summarizeFinance()` (or an equivalent Finance-owned aggregation)
  as a typed revenue/cost line item, never persisted or reported independently.
- Finance Platform (owner) and Data Platform (mandatory reviewer) approve the change.

`commerce-core/attribution.ts` may run against real data only when:

- The Prisma migration for conversion/touch persistence exists and is reviewed by Data
  Platform.
- Tenant isolation is enforced at the repository layer, not just present as a type field.
- Idempotency keys are enforced on write.
- The Phase 6 audit-event contract is implemented and every status transition emits one.
- Reversal rules (confirmed→reversed) are explicit and tested.
- Integration tests cover cross-tenant rejection (expect 403/rejection) end to end.

## Rollback strategy

- Every step above is additive: commerce-core stays a dependency, never a replacement, until
  its cutover conditions are met and reviewed. If a cutover step is later found unsafe, the
  canonical entry point simply stops calling the commerce-core primitive and reverts to its
  prior internal logic — no data migration rollback is needed for the scoring or profitability
  cutovers, because commerce-core functions are pure and stateless.
- The attribution cutover is the only step with persistence, and therefore the only one
  needing a real rollback plan: its migration must be additive (new tables, no destructive
  changes to `LinkClick`/`AffiliateLink`), so rollback is "stop writing to the new tables and
  stop calling `resolveAttribution`" without needing to reverse the migration itself.
- This ADR itself has no rollback risk: it adds documentation and non-invasive policy/test
  code, and does not remove or alter any existing production behavior.

## Tenant requirements

- Every commerce-core type that will ever touch real data (`TrackingTouch`, `ConversionEvent`,
  `AttributedConversion`, `ProviderSyncState`) already carries a `tenantId` field. That is a
  **type convention, not an enforcement mechanism** — enforcement must happen at the
  repository/persistence layer per `AGENTS.md` ("Tenant- und Workspace-Isolation
  durchgehend erzwingen"), which does not exist yet for these types.
- The Phase 5 approval policy defaults to deny when tenant context is missing (see Policy
  section) — this is implemented as part of this change, as pure policy logic, not wired to
  any live action.

## Approval gates

- A `scale` decision from any product-scoring primitive must never, by itself, trigger a
  budget, campaign, publishing, or external-provider action. See Phase 5 policy
  (`src/lib/commerce-core/policy.ts` — new in this change) for the binding rule set.
- A `reject` decision must never automatically delete production data.
- A `test` decision may only prepare actions within explicit budget/tool limits — it is not
  self-executing.
- A `watch` decision stays strictly read-only.

## Audit requirements

- Any future attribution status transition (`markConversionStatus`) that becomes
  load-bearing must emit a typed audit event carrying: tenant, conversion id, previous
  status, new status, reason, actor/agent, timestamp, idempotency key, correlation id, trace
  id, and approval id where applicable. The contract is defined in this change
  (`src/lib/commerce-core/audit-contract.ts`) but is not wired to any database or payout
  system — see Phase 6.

## Required tests

- Existing 45 `commerce-core` unit tests stay green.
- Typecheck (`pnpm exec tsc --noEmit`) stays clean.
- New tests for the Phase 5 policy: default-deny without a policy record, default-deny
  without tenant context, no automatic action is ever returned for `scale`.
- New tests for the Phase 6 audit contract shape.
- New tests for the currency-normalization result type (Phase 4): a missing exchange rate
  must be representable as an explicit non-silent result for financially-relevant callers.
- `pnpm run architecture:check` must not gain new failures attributable to this change (the
  pre-existing `helpers` violation from `d261580` is fixed as part of this change; unrelated
  pre-existing failures — `src/features`, `src/instrumentation.ts`, `src/server`, `src/test`,
  and three `.../new` route directories — predate this ADR and are out of scope).

## Non-goals of this change

- No existing production function is replaced, deprecated, or disabled.
- No live payout, commission, or publishing action is enabled.
- No Prisma migration is applied.
- No band number is assigned or invented; `commerce-core` remains
  `Unassigned Commerce/Finance Foundation`.
