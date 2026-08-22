# Profitability Ownership Matrix

Comparison of every profitability/margin/ratio calculator found in the repository, plus the
governance rule that applies to each. No function is disabled or changed by this document.

## The four (five, counting the ad-hoc one) calculators

| Calculator | Question it answers | Data basis | Number representation | Authority |
|---|---|---|---|---|
| `src/lib/finance/calculations.ts` `summarizeFinance()` / `estimateTaxReserve()` | What did the whole tenant actually earn/spend/owe in tax? | Persisted `Revenue`/`Expense` records | Prisma `Decimal` | **Authoritative** (Band 14, "die EINZIGE Finanz-Engine des Universums") |
| `src/features/products/domain/profitability.ts` `estimateProfitability()` | Before a post is made, is this offer worth the content investment? | Heuristic assumptions — in the only current caller (`core.ts:829-838`) the conversion rate (`0.02`), content cost (`50`), and platform cost (`10`) are **hardcoded**, not measured | `@/lib/shared/decimal` (`Decimal`, precision-safe) | **Pre-campaign estimate** — explicitly labeled indicative (`assumptionsProvided`, `confidenceScore`, `evidence`) |
| `src/lib/analytics/metrics.ts` `computeContentMetrics()` (incl. `RETURN_ON_CONTENT_SPEND` / ROCS, `REVENUE_PER_CLICK`, `REVENUE_PER_POST`) | Given actual impressions/clicks/conversions, how is this content performing? | Real aggregated content-performance counters | `@/lib/shared/decimal` | **Realized content-performance metric** — but has no refund/chargeback concept |
| `src/server/services/analytics.ts:96-101` (inline `roas`, `ctr`, `conversionRate`) | Ad-hoc dashboard KPI | `LinkClick`/`Revenue`/`Expense` aggregates | plain `number` | Non-authoritative, not versioned, **itself bypasses `metrics.ts`'s stated single-source-of-truth role** — pre-existing, independent of this change |
| `src/lib/commerce-core/profitability.ts` `calculateProfitability()` | Given realized, reconciled commission/refunds/chargebacks/7-category cost, what is net campaign profitability (EPC/CPA/ROAS)? | None yet — no Prisma model backs `ProfitabilityInput` | **plain `number`** — the only money math in this comparison not using a `Decimal` type | **None** — pure, unwired calculation primitive |

## Definitions, side by side

| Term | Band 14 Finance | `features/products/domain/profitability.ts` | `analytics/metrics.ts` | `commerce-core/profitability.ts` |
|---|---|---|---|---|
| Revenue/Umsatz | `totalRevenue` = Σ `Revenue.grossAmount` | `estimatedRevenuePerPost` = commission × assumed conversion rate | `revenuePerPost/View/Click` = `commissionRevenue / count` | not modeled directly (see `netCommission`) |
| Provision/Commission | not a distinct concept — commission is just part of `Revenue` | `estimatedCommissionPerConversion` (input, from `AffiliateOffer.commissionRate`/`commissionAmount`) | `commissionRevenue` (input, realized) | `confirmedCommission` / `openCommission` (input) minus `refunds`/`chargebacks` → `netCommission` |
| Kosten/Costs | `totalExpense` = Σ `Expense.amount` (7 category enum incl. `ADVERTISING`/`VIDEO_PRODUCTION`/`AI_CREDITS`) | `estimatedContentCost` + `estimatedPlatformCost` (2 categories, both defaulted to fixed values by the only caller) | `attributedCosts` (input, opaque single number) | `totalCost` = Σ of 7 named categories (`advertising`,`video`,`voice`,`models`,`platform`,`creator`,`software`) — a **different 7-category taxonomy than `Expense.category`**, not a 1:1 match |
| Gewinn/Profit | `provisionalProfit` = `contributionMargin` = revenue − expense | `estimatedNetRevenuePerPost` = commission − contentCost − platformCost, plus `lowerBound`/`upperBound` confidence band | `returnOnContentSpend` (ratio, not an absolute profit figure) | `contributionMargin` = `netCommission` − `totalCost` |
| ROAS | not modeled | not modeled | not modeled (ROCS is the closest, see below) | `netCommission / totalCost`, `null` if `totalCost ≤ 0` |
| ROCS (Return on Content Spend) | not modeled | not modeled | `estimatedNetRevenue / attributedCosts`, `null`-safe via `safeRatio` | not modeled — **structurally the same ratio shape as commerce-core's ROAS**, different name/scope (content spend only vs. all 7 cost categories) |
| EPC (earnings per click) | not modeled | not modeled | closest equivalent: `revenuePerClick = commissionRevenue / linkClicks` (gross, not net) | `netCommission / clicks` (net of refunds/chargebacks), `null` if `clicks ≤ 0` |
| CPA (cost per acquisition) | not modeled | not modeled | not modeled | `totalCost / conversions`, `null` if `conversions ≤ 0` — **no existing equivalent anywhere in the repo** |
| Conversion rate | not modeled | `estimatedConversionRate` (assumption input) | `conversions / linkClicks`, `null`-safe | `conversions / clicks`, `null` if `clicks ≤ 0` |

## Currency and exchange rates

- Band 14 Finance: `Revenue`/`Expense` each carry their own `currency` field; no FX-conversion
  logic was found in `calculations.ts` in this pass (not re-verified beyond the earlier audit
  — out of scope here, flagged for Finance Platform to confirm).
- `commerce-core/profitability.ts`: takes a single `currency: string` per calculation — no FX
  conversion inside; assumes the caller already normalized to one currency.
- `commerce-core/attribution.ts` `normalizeCurrency()` **is the actual risk area**: when no
  rate is available for a `fromCurrency → toCurrency` pair, it returns the original value and
  original currency unchanged with `normalized: false`. Today every caller in the test suite
  treats `normalized: false` as informational. **If this function is ever used to feed a
  financially-authoritative calculation, treating "unchanged" as "correct" is unsafe** — a
  10 USD commission silently reported as 10 EUR (because no rate was configured) is a real
  money bug, not a display quirk. `normalized: false` is enough information for a caller to
  detect this, but nothing currently forces a caller to check it.

**Decision (per the mandate for this change): behavior is not changed yet.** A safe result
type is designed here (`src/lib/commerce-core/currency-result.ts`, added in this change) that
makes "no rate available" impossible to silently ignore for a caller that opts into
`normalizeCurrencyStrict()`. `normalizeCurrency()` itself is untouched — its existing 45
passing tests and its existing (test-only, unwired) call sites keep working exactly as today.
Switching a real financial caller to the strict variant is a separate, reviewed decision, to
be made once a real consumer exists (none does today).

## Rounding

- Finance (`calculations.ts`) and both `features/products/`/`analytics/metrics.ts` paths use
  `Decimal` (Prisma `Decimal` in Finance, `@/lib/shared/decimal` in the other two) —
  precision-safe, no binary floating-point rounding error.
- `commerce-core/profitability.ts` is the **only** money-adjacent calculator in this
  comparison using plain JavaScript `number` with manual epsilon-rounding
  (`roundMoney`/`roundRatio`). This is acceptable for a pure, unwired primitive with unit
  tests, but is a concrete reason it must never become a second source of persisted financial
  truth without passing through a `Decimal`-based layer first — exactly the rule this ADR
  encodes (Commerce Core → primitives only; Finance → validates and persists).

## Data source and authority — one paragraph each

- **Pre-campaign estimate** (`features/products/domain/profitability.ts`): answers "should we
  bother making this content," before any real event exists. Explicitly indicative. Stays
  owned by Product Platform. Not touched by this change.
- **Realized profitability** (`commerce-core/profitability.ts`): answers "how did this
  campaign actually perform, net of refunds/chargebacks," from data that does not exist in
  Prisma yet. Cannot become authoritative until it has real data and is routed through
  Finance (see ADR cutover conditions). Not wired to anything in this change.
- **Reporting metrics** (`analytics/metrics.ts`): answers "how is this content/channel
  performing," from real engagement/click/conversion counters, but has no refund/chargeback
  or realized-commission-netting concept — it is a different question than either of the
  above, not a duplicate of either.
- **Ad-hoc dashboard ROAS** (`analytics.ts:96-101`): pre-existing, narrow, non-versioned.
  Flagged as a candidate for later consolidation into `metrics.ts`, independent of
  commerce-core.

## Assessment

`commerce-core/profitability.ts` fills a real gap (net-of-refunds/chargebacks, 7-category
cost, EPC/CPA) that none of the other three calculators compute. It is not a duplicate of any
one of them individually, but if left unmanaged it becomes a **fifth, competing "profit
number"** for the same underlying business events. The binding rule from the ADR applies:
commerce-core's output may only ever become authoritative by flowing into `summarizeFinance()`
as a typed line item — it must never be persisted, reported, or exposed as an independent
"profitability" figure.

No function's behavior changed in this document.
