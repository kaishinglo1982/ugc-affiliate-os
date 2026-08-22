/**
 * UGC Commerce Core — public entry point.
 *
 * Pure, framework-free commerce logic: deterministic product scoring,
 * last-touch attribution, profitability snapshots and provider-neutral
 * contracts for affiliate networks and social publishing.
 *
 * This module provides primitives only — see
 * `docs/architecture/ADR-COMMERCE-CORE-CONSOLIDATION.md` for ownership
 * boundaries. It has no API route, no workflow, no agent registration, no
 * queue consumer, and triggers no autonomous action. `policy.ts` and
 * `audit-contract.ts` are decision/contract definitions, not live wiring.
 */
export * from "./types";
export * from "./product-score";
export * from "./attribution";
export * from "./profitability";
export * from "./providers";
export * from "./policy";
export * from "./currency-result";
export * from "./audit-contract";
