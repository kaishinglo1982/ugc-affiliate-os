# CarryOS Plugin Contract — UGC Affiliate OS

## Purpose

UGC Affiliate OS is an **industry plugin** of CarryOS. Generic agents, workflow execution, provider routing, tenant authority, permissions, audit and platform services belong to CarryOS Core; UGC owns only its affiliate/UGC domain.

## Canonical identity

- Plugin ID: `ugc-affiliate-os`
- Kind: `industry`
- Manifest version: `2`
- Runtime entrypoint: `/api/v1/plugins/ugc/execute`
- Required capability: `ugc:runtime:execute`
- CarryOS execution scope: `carryos:workflow:execute`
- Contract version: `2026-09-16.v1`

## Ownership boundary

### CarryOS Core owns

- Agent Runtime
- Workflow Engine
- Skill Registry
- Plugin Registry / Marketplace / Entitlements
- Connector / MCP layer
- Provider routing and AI governance
- Event Bus
- Permission Broker
- Tenant authority
- Audit and security primitives
- Secrets / credential brokering

### UGC Affiliate OS owns

- Affiliate programs, offers and attribution domain
- Product discovery and product intelligence
- Content briefs, hooks, scripts and UGC-domain content metadata
- Affiliate opportunity scoring and profitability estimates
- UGC analytics / experimentation domain records
- Affiliate-specific compliance rules
- UGC-specific process templates and domain skills

UGC must not create a second generic agent runtime, generic workflow engine, generic AI router, or independent tenant authority.

## Execution contract

A CORE_BOUND request must be authenticated by CarryOS and resolved to an authoritative tenant. The UGC service may resolve the bound local workspace, but the caller cannot select an arbitrary workspace through request input.

The execution layer must remain fail-closed:

1. invalid/missing CarryOS assertion → reject;
2. missing tenant-to-workspace binding → reject;
3. caller tenant/workspace mismatch → reject;
4. missing required capability/scope → reject;
5. direct provider routing outside CarryOS governance → reject;
6. paid/external side effects → require the existing approval/budget gates.

## Events

The manifest declares only UGC-domain events. Generic platform events remain CarryOS-owned.

Published events are versioned and must contain the bound workspace identifier. Consumers must treat event payloads as untrusted input and re-check tenant authorization before mutating state.

## Provider policy

UGC may keep deterministic local/offline domain logic for tests and explicitly allowed offline workflows. In CORE_BOUND production, external model/provider routing is delegated to CarryOS governance. UGC must not introduce a competing direct LLM router.

## Deployment gate

This contract is repository-level only until the cross-repository CarryOS integration is validated. It does not authorize a production deployment. No Vercel production deployment is part of this phase.

## 10/10 evidence required later

- CarryOS registry accepts the manifest.
- UGC execution route is verified against the exact CarryOS contract.
- Tenant isolation has negative cross-workspace tests at application and database layers.
- Schema/migration drift is reconciled without destructive generated SQL.
- Fresh-DB migration, typecheck, lint, unit/integration tests, build and E2E are green.
- Real production secrets/bindings are supplied outside source control.
