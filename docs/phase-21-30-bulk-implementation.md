# UGC Affiliate OS — Phase 21–30 Bulk Implementation

Branch: `feat/carryos-ugc-phases-21-30-bulk`

This batch adds typed, fail-closed governance contracts that sit on top of the existing UGC domain models and the CarryOS runtime boundary.

## Scope

- Phase 21 — event/outbox contract and idempotent event identity
- Phase 22 — idempotency/conflict detection
- Phase 23 — bounded exponential retry policy
- Phase 24 — approval boundary with expiry and multi-approver requirement
- Phase 25 — publishing safety gate (approval, disclosure, kill switch)
- Phase 26 — tenant-scoped attribution event contract
- Phase 27 — analytics synchronization consistency contract
- Phase 28 — deterministic experiment assignment contract
- Phase 29 — opportunity priority calculation
- Phase 30 — correlation-aware operational health contract

## Existing-model rule

This batch deliberately does not introduce duplicate product, campaign, social, analytics, attribution, workflow, or agent models. Persistence/API integration must use the existing Prisma domain models and CarryOS-owned shared infrastructure.

## Safety

- No Vercel deployment.
- No production secrets.
- No mock runtime implementation.
- No second workflow/agent runtime.
- Workspace identity remains server-side/CarryOS-governed.
- Publishing and spend-related paths fail closed when required governance is missing.

## Validation status

The contracts include focused Vitest coverage. Full repository CI/typecheck/lint/build status must be verified by GitHub Actions before merge; this document does not claim those gates are green.

## Next

The next implementation tranche should wire these contracts into the existing event, publishing, attribution, analytics, experimentation and operations services, then run the full repository gates. Phase 21–30 is not considered 10/10 solely because these contracts exist.
