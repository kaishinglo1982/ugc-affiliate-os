# Commerce Core Remediation Result

Consolidation of `src/lib/commerce-core/` (commit `d261580`) against the productive
Product/Finance/Analytics/Attribution surfaces it overlaps with. Read/document/test-only
change: no existing production function was replaced, deprecated, disabled, or wired to a
live action.

## Starting state

- `d261580` on branch `agent/ugc-commerce-core`: 11 files, 1769 insertions, 45/45 tests green,
  clean typecheck — but committed without checking existing implementations of the same
  concerns.
- Working tree was clean before this change (verified via `git status --short --branch`,
  `git log -3 --oneline`, `git show --stat --oneline d261580`).

## Architecture decision

See `docs/architecture/ADR-COMMERCE-CORE-CONSOLIDATION.md` for the full record. Summary:

- **Canonical entry points stay canonical.** `scoreProductOpportunities()`
  (`src/features/products/application/core.ts`) for product scoring,
  `summarizeFinance()`/`estimateTaxReserve()` (`src/lib/finance/calculations.ts`) for
  authoritative finance, `estimateProfitability()`
  (`src/features/products/domain/profitability.ts`) for pre-campaign estimates.
- `commerce-core` becomes, by explicit rule, a **primitives-only** library: typed scoring
  primitives, an attribution resolver, profitability calculation primitives, normalized
  provider contracts. It gains no API route, no workflow, no agent registration, no queue
  consumer, no autonomous action path — enforced by not adding any of those in this change.
- Band assignment stays `Unassigned Commerce/Finance Foundation`. No band number invented.

## Changed / created files

| File | Change |
|---|---|
| `docs/architecture/ADR-COMMERCE-CORE-CONSOLIDATION.md` | New — architecture decision record |
| `audit/SCORING_CONSOLIDATION_MATRIX.md` | New — `scoreProductOpportunities()` vs. `commerce-core/product-score.ts` comparison + signal mapping table |
| `audit/PROFITABILITY_OWNERSHIP_MATRIX.md` | New — 4-way profitability/ratio calculator comparison + ownership rules |
| `audit/COMMERCE_CORE_REMEDIATION_RESULT.md` | New — this file |
| `src/lib/commerce-core/policy.ts` | New — `authorizeProductAction()` approval gate for `scale`/`test`/`watch`/`reject`; pure, unwired |
| `src/lib/commerce-core/currency-result.ts` | New — `normalizeCurrencyStrict()`, an opt-in safe-result variant of `normalizeCurrency()`; existing function unchanged |
| `src/lib/commerce-core/audit-contract.ts` | New — typed/Zod-validated audit-event contract for future attribution status transitions; no persistence, no wiring |
| `src/lib/commerce-core/__tests__/policy.test.ts` | New — 14 tests |
| `src/lib/commerce-core/__tests__/currency-result.test.ts` | New — 7 tests |
| `src/lib/commerce-core/__tests__/audit-contract.test.ts` | New — 7 tests |
| `src/features/products/domain/scoring-consolidation.test.ts` | New — 7 characterization tests encoding the scoring matrix's claims |
| `src/features/products/domain/profitability-ownership.test.ts` | New — 5 characterization tests encoding the profitability matrix's claims |
| `src/lib/commerce-core/index.ts` | Modified — exports the three new modules; added a boundary docstring pointing at the ADR |
| `src/lib/commerce-core/providers.ts` | Modified — one comment path updated (`__tests__/helpers/` → `__tests__/fixtures/`) |
| `src/lib/commerce-core/__tests__/providers.test.ts` | Modified — import path updated for the fixtures rename |
| `src/lib/commerce-core/__tests__/helpers/test-adapters.ts` → `.../fixtures/test-adapters.ts` | Renamed — `helpers` is a forbidden directory name per `architecture.config.mjs`; this was introduced by `d261580` and is fixed here |

No file outside `commerce-core`, its new test/doc siblings, and the two characterization test
files in `src/features/products/domain/` was touched. No existing test was deleted, skipped,
or weakened.

## Canonical entry point (confirmed unchanged)

1. Product scoring: `scoreProductOpportunities()` — unchanged, still the only path wired to
   `POST /api/products/opportunities/score`.
2. Authoritative finance: `summarizeFinance()` / `estimateTaxReserve()` — unchanged.
3. Pre-campaign profitability: `estimateProfitability()` — unchanged.
4. Attribution resolution: none — still no canonical entry point; `resolveAttribution` remains
   unwired.

## Remaining duplicates (documented, not removed)

- `scoreProductOpportunities()` vs. `commerce-core/product-score.ts` — full signal mapping in
  `audit/SCORING_CONSOLIDATION_MATRIX.md`. Not merged; cutover conditions defined in the ADR.
- `estimateProfitability()` vs. `commerce-core/profitability.ts` — different questions
  (pre-campaign estimate vs. realized), not merged; ownership boundaries defined in
  `audit/PROFITABILITY_OWNERSHIP_MATRIX.md`.
- `analytics/metrics.ts` ROCS vs. commerce-core's ROAS — same ratio shape, different name/
  scope; flagged, not merged.
- `src/server/services/analytics.ts:96-101` inline ROAS/CTR — pre-existing, independent of
  commerce-core; flagged for a later, separate consolidation into `metrics.ts`.

## Implemented approval gates

- `src/lib/commerce-core/policy.ts` `authorizeProductAction()`:
  - `scale` → `budget_change`/`campaign_change`/`publishing_action`/`provider_action` are
    `permitted: true` but **`autoExecutable` is hardcoded `false`** and
    `requiresHumanApproval: true`, unconditionally — not configurable by any policy value.
  - `reject` → only `read_only_observation` is permitted; `data_deletion` is denied
    unconditionally.
  - `test` → only `prepare_action` is permitted, gated by `policy.allowAutomatedActions`
    (default `false`), a budget ceiling, and an explicit tool allow-list.
  - `watch` → only `read_only_observation` is permitted.
  - Missing `tenantId` → denied (`missing_tenant_context`).
  - Missing policy record → denied (`missing_policy`) — default-deny.
- **Not connected to any live action.** No caller invokes `authorizeProductAction` anywhere
  outside its own test file.

## Test commands and exit codes

| Command | Result |
|---|---|
| `pnpm exec tsc --noEmit` | Exit 0 — clean |
| `pnpm exec vitest run src/lib/commerce-core` | Exit 0 — 74/74 passed (45 original + 29 new: policy 14, currency-result 7, audit-contract 8) |
| `pnpm exec vitest run src/features/products/domain` | Exit 0 — 73/73 passed (includes the 2 new characterization files: scoring-consolidation 7, profitability-ownership 5) |
| `pnpm exec vitest run src/lib/optimization src/lib/finance src/lib/analytics` | Exit 0 — 17/17 passed (`src/lib/optimization` and `src/lib/finance` have **no test files today** — pre-existing gap, not introduced by this change; all 17 come from `src/lib/analytics/{event,metrics}.test.ts`) |
| `pnpm exec vitest run` (full suite) | Exit 0 — 331 passed, 4 skipped (335 total across 44 files, 1 file fully skipped). The 4 skips are **pre-existing and unrelated**: none of the files added or modified in this change contain `.skip`/`.todo` (verified by grep). |
| `pnpm run architecture:check` | Exit 1 — 7 failures, **all pre-existing and unrelated to this change** (`src/features`, `src/instrumentation.ts`, `src/server`, `src/test` unregistered top-level areas; 3 `.../new` route directories). The one violation introduced by `d261580` (`__tests__/helpers`) is fixed in this change and no longer appears. |
| `pnpm run lint` (`eslint .`) | Exit 2 — **pre-existing, repo-wide tooling failure**: `@typescript-eslint/typescript-estree` crashes under TypeScript 7.0.2 (`Cannot read properties of undefined (reading 'Cjs')`), reproduced on an unmodified checkout too. Not caused by this change; not fixed by this change (out of scope — a TypeScript-tooling compatibility issue, not a commerce-core concern). |

No test was disabled, skipped, or had an assertion weakened to reach these results.

## Remaining P0/P1 risks

- **P0** — `commerce-core/attribution.ts` has zero backing Prisma models
  (`ConversionEvent`/`TrackingTouch`/`Commission`/`Payout`/`AttributionEvent` all absent from
  `prisma/schema.prisma`). It cannot become load-bearing without a reviewed migration, and
  must not be wired to anything until it has one.
- **P0** — `pnpm run lint` is broken repository-wide (TypeScript 7 / `@typescript-eslint`
  incompatibility). This blocks the "Lint grün" quality gate for every change in the
  repository, not just this one — flagged for whoever owns the TypeScript 7 migration
  (see recent commits `770e7b8`, `4a3ca88`).
- **P1** — `commerce-core/profitability.ts` uses plain JS `number` for money math while every
  other financially-adjacent module in the repo uses `Decimal`. Acceptable for an unwired
  primitive; must be revisited before any real-money wiring.
- **P1** — `normalizeCurrency()` (unchanged) silently passes through the original value when
  no exchange rate is configured. `normalizeCurrencyStrict()` now exists as a safe opt-in
  alternative, but nothing forces a future financially-relevant caller to use it instead of
  the original function — this is a code-review responsibility going forward, not something
  a type system alone prevents.
- **P1** — `src/features/products/application/core.ts`'s only caller of
  `estimateProfitability()` and `scoreOpportunity()` still hardcodes several inputs
  (`estimatedConversionRate: 0.02`, `estimatedContentCost: 50`, `estimatedPlatformCost: 10`,
  `competitionScore: 50`, `trendScore: 50`) instead of measuring them — a pre-existing data
  gap in production, unrelated to commerce-core, worth flagging to Product Platform.

## Necessary later Prisma models

- `ConversionEvent`, `TrackingTouch` (or equivalent) — required before `resolveAttribution`
  can run against real data.
- A `Commission`/`Payout` model, or fields added to the existing affiliate models — required
  before `markConversionStatus` can affect anything real.
- No migration is proposed or applied in this change.

## Recommended next cutover step

Per the ADR's cutover conditions, the smallest safe next step is **not** a code cutover — it
is a Product Platform + Data Platform review of `audit/SCORING_CONSOLIDATION_MATRIX.md` to
decide, in writing, whether `scoreProductOpportunities()` should internally adopt
`commerce-core/product-score.ts` as its scoring primitive (with the documented
polarity/threshold reconciliations for `competitionScore`/`complianceScore` resolved first).
Nothing about attribution or profitability should move before that review, since scoring is
the only one of the three with a plausible near-term cutover path at all.

## Band assignment

Unchanged: **`Unassigned Commerce/Finance Foundation`**. Nothing found in this pass makes any
existing band number unambiguously correct — see the ADR and the original integration-matrix
report for the evidence trail (Band 18's own model, `AttributionEvent`, still does not exist
in code; Band 14 explicitly forbids a second finance engine; Band 12 does not claim
`src/features/products/`, so even the module commerce-core duplicates is itself unassigned).
