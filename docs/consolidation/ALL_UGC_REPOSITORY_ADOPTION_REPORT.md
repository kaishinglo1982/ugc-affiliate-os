# All UGC Repository Adoption Report

## Scope

This audit reviewed every repository visible in the connected GitHub account for UGC, affiliate, content-production, provider-routing, governance, compliance, finance, and release patterns that can strengthen `ugc-affiliate-os`.

Per product-owner direction, **Who Knows and all nested Who Knows content were excluded**. No branding, storefront code, prompts, data, or domain logic from those sources was adopted.

## Repository decisions

| Repository | Relevant material | Decision |
| --- | --- | --- |
| `ugc-affiliate-os` | Canonical product and consolidation PR | Keep as the single target |
| `one-user-ugc-affiliate-center` | Circuit breaker, redaction, claims/disclosures, reconciliation | Circuit breaker and redaction already adopted; finance/compliance remain staged candidates |
| `one-user-ugc-affiliate-center-main` | Same product family, additional implementation history | Used for comparison; only unique, tested patterns qualify |
| `carryos` | UGC producer, approval workflow, agent governance | Adopt generic default-deny tool governance; reject brand/provider-bound producer and mock-publish fallback |
| `Carry-OS` | Earlier CarryOS patterns | No duplicate copy; superseded by stronger generic implementation |
| `SHK-Office-Edition` | Agent runtime and UGC producer variants | Reject domain-specific code and branding |
| `escort-agency-os` | Tenant-aware content lifecycle, rights, consent, human approval, provider data policy | Adapt lifecycle and provider data-classification concepts without domain code |
| `Noir-Agency` | Provider routing, compliance and agent-control patterns | Reference only; canonical modules already cover the useful generic surface |
| `noir-agency-impl` | Noir implementation variants | No unique UGC capability worth transplanting |
| `NCH-Agency-` | Agency workflow variants | No unique, production-ready UGC capability worth transplanting |
| `compute-the-platform-to-build-zd` | UGC/affiliate UI, agents and provider integrations | Reject product/storefront coupling; no Who Knows-derived content adopted |
| `finance-app` | General finance implementation | Out of scope unless a later reconciliation ledger gap is confirmed |
| `Trading-Dashboard` | Trading UI and market workflows | Out of scope |
| `Noir-Agency` and agency variants | Payment/provider infrastructure | Keep only as architectural references; do not import unrelated domain code |
| `who-knows-enterprise` / `ugc-affiliate-agency` | Who Knows product family | Explicitly excluded |

## Adopted in this pass

1. **Content lifecycle policy**
   - Complete UGC production state machine
   - Workspace isolation
   - Rights and consent gates
   - Human-only approval
   - Capability checks, version increments and audit-event output

2. **AI provider data policy**
   - PUBLIC / INTERNAL / CONFIDENTIAL / RESTRICTED classification
   - Explicit provider eligibility
   - Minimum-quality threshold
   - Safe filtering before provider selection

3. **Agent tool governance**
   - Default-deny grants
   - Per-run call limits
   - Timeouts and side-effect classification
   - Mandatory human approval for publish/spend-class tools

All three modules are provider-neutral and work without an OpenAI API key.

## Intentionally rejected

- Hard-coded brands, domains, personas, products or providers
- Automatic fallback from failed live publishing to fake/mock success
- Cross-tenant records or unscoped global state
- Agent-only final approval
- Unverified migration mocks presented as production data
- Duplicate modules that are weaker than the canonical implementation
- Any Who Knows-derived content

## Next candidates

The remaining potentially valuable work is narrower and should be adopted only with matching persistence and UI integration:

- evidence-backed affiliate claims and disclosure enforcement
- reconciliation ledger and payout invariants
- backup/restore runbooks and release evidence
- accessibility and performance gates
