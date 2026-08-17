# Scoring Consolidation Matrix

Comparison of `scoreProductOpportunities()` (production, `src/features/products/`) vs.
`commerce-core/product-score.ts` (`scoreProduct()`, committed in `d261580`, unwired).
Read-only comparison — **no function is disabled or replaced by this document.**

## Side-by-side

| Aspect | `scoreProductOpportunities()` / `scoreOpportunity()` | `commerce-core/product-score.ts` `scoreProduct()` |
|---|---|---|
| Input signals | 9 components: `commissionScore`, `demandScore`, `competitionScore`, `contentFitScore`, `audienceFitScore`, `trendScore`, `profitabilityScore`, `dataQualityScore`, `complianceScore` — all pre-computed 0..100 ints before the call | 12 signals: 7 positive (`demand`, `trendGrowth`, `commission`, `audienceFit`, `contentFit`, `conversionProbability`, `repurchasePotential`) + 5 risk (`competitionRisk`, `returnRisk`, `productionCostRisk`, `advertisingCostRisk`, `complianceRisk`) — all optional 0..100 ints, Zod-validated |
| Weighting | `OPPORTUNITY_WEIGHTS` (`src/features/products/domain/types.ts:631-641`), single flat weight set, sums to 1.0: commission .15, demand .15, competition .10, contentFit .15, audienceFit .10, trend .10, profitability .15, dataQuality .05, compliance .05 | Two weight sets each summing to 1.0: `POSITIVE_WEIGHTS` (demand .20, trendGrowth .15, commission .20, audienceFit .10, contentFit .10, conversionProbability .15, repurchasePotential .10) and `NEGATIVE_WEIGHTS` (competitionRisk .25, returnRisk .20, productionCostRisk .15, advertisingCostRisk .15, complianceRisk .25) |
| Normalization | No renormalization for missing signals — caller always supplies all 9 with defaults/heuristics before calling | Missing signals renormalized out per side (weighted average over only provided signals); a side with zero signals defaults to a neutral 50 |
| Missing-data handling | N/A — inputs are always fully populated by the caller (with placeholder heuristics, see below) | `confidence = 0.3 + 0.7 × (providedCount / 12)`; fully empty input now yields `score = 50` (fixed in `d261580` follow-up) |
| Score range / rounding | `Math.round(total)`, clamped 0..100 | `Math.round(clampScore(positive − negative))`, clamped 0..100 |
| Thresholds / status | **None in the scoring function itself.** `complianceCritical` forces `total = 0`. The persisted `status` is always `"NEW"` at creation (`core.ts:966`) — status transitions (`UNDER_REVIEW`/`APPROVED`/`REJECTED`/…) happen elsewhere, not derived from `totalScore` | `DECISION_THRESHOLDS`: `scale ≥ 75`, `test ≥ 55`, `watch ≥ 35`, else `reject`. `complianceRisk ≥ 80` forces `reject` automatically. **The decision is produced synchronously with the score, in the same call.** |
| Confidence model | `confidenceScore` is an **external input**, then multiplied by a data-quality penalty (`×0.7` if `dataQualityScore < 50`) and a sample-size penalty (`×0.8` if `sampleSize` null or `< 30`) | `confidence` is **entirely derived** from how many of the 12 signals were provided; it is never an input |
| Tenant context | `workspaceId` (defaults to `DEFAULT_WORKSPACE_ID` when omitted — see Security/Tenant risk note below), propagated through `prisma.product.findMany({ where: { workspaceId, ... } })` | `tenantId` field exists on the persistence-adjacent types this module would eventually feed (`TrackingTouch`, `ConversionEvent`), but `product-score.ts` itself is a pure function with no tenant parameter at all — it never sees a tenant |
| Persistence | Full write path: `ProductOpportunity` + `ProductOpportunityScoreComponent`, delete-then-create inside `prisma.$transaction` (`core.ts:957-996`) | None — pure function, no side effects |
| API contract | `POST /api/products/opportunities/score` (`src/app/api/products/opportunities/score/route.ts`), Zod body validation, `requireApiPermission("product_opportunities.score")`, `writeAuditLog(...)` on success | None |
| Consumers | The API route above; `actor` resolved via `getCurrentUser()` | None — not called anywhere |
| Tests | `src/features/products/domain/opportunity-scoring.test.ts` | `src/lib/commerce-core/__tests__/product-score.test.ts` (10 tests) |
| Side effects | DB transaction, `incrementMetric(METRICS.productOpportunitiesCreatedTotal, ...)`, structured `log(...)`, audit log entry | None — deterministic, side-effect free |

## Signal mapping table

| Bestehendes Signal | Commerce-Core-Signal | Semantik identisch | Konvertierung | Informationsverlust | Entscheidung |
|---|---|---|---|---|---|
| `commissionScore` (0.15) | `commission` (0.20, positive) | Ja | Direkt übertragbar | Keiner | Übernehmbar |
| `demandScore` (0.15) | `demand` (0.20, positive) | Ja | Direkt übertragbar | Keiner | Übernehmbar |
| `competitionScore` (0.10) — **aktuell hartcodierte Konstante `50`** (`core.ts:917`), Label "Competition (inverse)" deutet auf positive Polung (hoch = wenig Konkurrenz = gut) | `competitionRisk` (0.25, negative — hoch = schlecht) | **Nein** — entgegengesetzte Polung | Invertierung nötig (`competitionRisk ≈ 100 − competitionScore`) | Hoch — Produktionswert ist aktuell kein echtes Signal, sondern ein Platzhalter | Nicht übernehmbar ohne echtes Signal + Polungs-Korrektur |
| `contentFitScore` (0.15, Durchschnitt aus 3 Content-Fit-Sub-Metriken) | `contentFit` (0.10, positive) | Ja | Direkt übertragbar | Gering (Herkunft: Durchschnitt vs. Einzelwert) | Übernehmbar |
| `audienceFitScore` (0.10) — **binäre Heuristik** 60/40 je nach `nicheId` gesetzt/nicht (`core.ts:927`) | `audienceFit` (0.10, positive) | Ähnlich | Direkt übertragbar sobald echtes Signal existiert | Hoch — Produktionswert hat aktuell nur 2 mögliche Werte statt 0..100-Granularität | Nicht 1:1 übernehmbar ohne echtes Signal |
| `trendScore` (0.10) — **hartcodierte Konstante `50`** (`core.ts:928`) | `trendGrowth` (0.15, positive) | Ähnlich | Direkt übertragbar sobald echtes Signal existiert | Hoch — kein echtes Signal in Produktion | Nicht übernehmbar ohne echtes Signal |
| `profitabilityScore` (0.15) — binär 70/20 abgeleitet aus `ProductProfitabilityEstimate.estimatedNetRevenuePerPost > 0` | **kein Äquivalent** in `ProductScoreInput` | Nein | Kein direktes Ziel — Commerce-Core trennt Scoring und Profitability strikt in zwei Module | Strukturell: Architekturentscheidung, kein Bugfix | Erfordert Architekturentscheidung (siehe ADR) |
| `dataQualityScore` (0.05) | **kein Äquivalent** | Nein | Kein direktes Ziel — Commerce-Core hat kein Datenqualitäts-Signal, `confidence` wird stattdessen aus Signal-Vollständigkeit abgeleitet | Mittel | Konzeptunterschied, keine Konvertierung möglich |
| `complianceScore` (0.05, binär 100/0) + `complianceCritical` (bool, setzt `total=0`) | `complianceRisk` (0.25, negative) + `COMPLIANCE_REJECT_THRESHOLD = 80` | Ähnlich, aber **Gewichtung und Mechanismus stark unterschiedlich** (5 % Gewicht + separates Hard-Block-Flag vs. 25 % Gewicht + Schwellenwert) | Invertierung + Schwellenwert-Abgleich nötig | Mittel — beide blockieren kritische Fälle, aber über unterschiedliche Mechanismen | Erfordert explizite Abstimmung, nicht automatisch übernehmbar |
| `confidenceScore` (externer Input, dann durch Datenqualitäts-/Sample-Penalty moduliert) | `confidence` (reiner Output aus Signal-Vollständigkeit) | Nein | Keine 1:1 Konvertierung — unterschiedliches Konzept (extern geschätzt vs. intern berechnet) | Hoch | Architekturentscheidung nötig |
| `sampleSize` (aus `ratingCount`) | **kein Äquivalent** | Nein | Kein Ziel | Mittel (beeinflusst nur Confidence-Penalty in Produktion) | Kein Handlungsbedarf ohne Confidence-Redesign |
| — | `conversionProbability` (0.15, positive) | — | — | — | Neues Signal, in Produktion nicht erhoben |
| — | `repurchasePotential` (0.10, positive) | — | — | — | Neues Signal, in Produktion nicht erhoben |
| — | `returnRisk` (0.20, negative) | — | — | — | Neues Signal, in Produktion nicht erhoben |
| — | `productionCostRisk` (0.15, negative) | — | — | — | Neues Signal, in Produktion nicht erhoben |
| — | `advertisingCostRisk` (0.15, negative) | — | — | — | Neues Signal, in Produktion nicht erhoben |
| `status` (immer `"NEW"` bei Erstellung, workflow-gesteuert) | `decision` (`scale`/`test`/`watch`/`reject`, **automatisch aus Score abgeleitet**) | **Nein — fundamentaler Architekturunterschied** | Kein automatischer Cutover möglich | Kritisch: ein naiver Ersatz würde jede Bewertung sofort mit einer handlungsleitenden Kategorie versehen, wo heute ein neutraler Status + manueller Review steht | **Muss über das Approval-Gate laufen (Phase 5), niemals automatisch** |

## Assessment

- Four of nine existing components map cleanly (`commission`, `demand`, `contentFit`,
  partially `audienceFit`/`trend`). Two of those four (`audienceFit`, `trend`) are currently
  **hardcoded placeholders or binary heuristics in production**, not real signals — the gap
  is in production data, not in commerce-core.
- `competitionScore` and `complianceScore` need explicit polarity/threshold reconciliation
  before any merge — a blind field-rename would silently invert their effect on the score.
- `profitabilityScore` and `dataQualityScore` have no commerce-core equivalent by design —
  commerce-core treats profitability as a separate concern (see
  `audit/PROFITABILITY_OWNERSHIP_MATRIX.md`), and has no data-quality signal at all.
- Commerce-core adds five signals (`conversionProbability`, `repurchasePotential`,
  `returnRisk`, `productionCostRisk`, `advertisingCostRisk`) that production does not
  currently compute anywhere.
- The single most important difference is not a signal at all: production separates "compute
  a score" from "decide a workflow status" (status stays `NEW`, a human or later process
  decides `APPROVED`/`REJECTED`), while commerce-core's `scoreProduct()` **fuses scoring and
  a categorical action-bearing decision into one call**. This is the concrete reason the
  binding rule "a `scale` decision never automatically triggers an action" (see ADR, Phase 5)
  exists, and the reason no cutover happens in this change.

No function is disabled. This matrix is input to a future, separately reviewed decision.
