# UGC Affiliate OS — CarryOS Evaluation Benchmarks

This repository publishes domain-specific benchmark suites only. CarryOS remains the sole EvalRunner, verifier/regression engine, model/provider comparison layer and QualityEvaluation persistence authority.

The real manifests under `evaluation/suites/` cover Product Scout evidence, affiliate offer truthfulness, script disclosure/claims, read-only compliance review and provider-backed video lifecycle status. They are bound to actual keys in the seeded `AGENT_CATALOG` and intentionally emit no pre-baked PASS baseline.

## Release invariants

- no cross-tenant evidence or state;
- no fabricated product, commission, attribution, provider-job or publication success;
- no publication without valid approval and disclosure;
- compliance review cannot self-approve or self-publish;
- external provider success must be backed by provider job evidence.
