# ADR-002: Offline-first AI routing

## Status

Accepted for the integration baseline.

## Decision

UGC Affiliate OS owns a provider-neutral AI contract under `src/lib/ai`.
The default provider is deterministic, offline, tenant-aware at the request boundary,
and has zero external cost. Live providers are optional adapters registered behind
the same contract. No domain service may read provider API keys directly.

## Required controls

- Every request includes a non-empty `workspaceId`.
- Capabilities, inputs, outputs, usage, cost and trace identifiers are typed.
- Offline fallback can be disabled for workflows that require live generation.
- Publishing, paid actions and unsupported product claims remain behind human approval.
- BYO credentials must be resolved through the encrypted credential vault.
- Provider adapters must not log prompts, credentials or personal data by default.
- OpenAI remains an optional adapter; this baseline does not require an API key.

## Consequences

The application, tests and demonstrations can run without an external AI API.
Adding OpenCode, local models, OmniRoute or OpenAI does not change UGC domain logic.
