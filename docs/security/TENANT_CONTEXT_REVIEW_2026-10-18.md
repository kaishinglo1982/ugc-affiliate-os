# Tenant Context Review — 2026-10-18

## Scope

Static review of:
- `src/lib/auth/tenant.ts`
- `src/lib/auth/carryos-workspace-binding.ts`
- `src/lib/auth/core-bound-rbac.ts`
- `src/lib/config/workspace.ts`
- `src/lib/auth/tenant.test.ts`
- `src/lib/db/workspace-transaction.ts`

No application code was changed and no tests were executed in this review.

## Findings

### 1. Tenant header is optional outside CORE_BOUND mode

`resolveWorkspaceId()` returns `DEFAULT_WORKSPACE_ID` when the tenant header is absent unless `CARRYOS_INTEGRATION_MODE === "CORE_BOUND"`. The fallback is explicitly described as single-tenant behavior in `src/lib/config/workspace.ts` and tested in `tenant.test.ts`; therefore it is not automatically a bug for a private, single-workspace installation.

**Deployment risk:** if a multi-tenant deployment omits or misspells `CARRYOS_INTEGRATION_MODE=CORE_BOUND`, requests without a tenant assertion can silently resolve to the default workspace. Multi-tenant deployments must validate configuration at startup and fail closed, rather than relying on an operator remembering an environment variable.

### 2. CORE_BOUND resolution has fail-closed controls

In CORE_BOUND mode, a missing tenant header is rejected. A signed token is verified using issuer `carryos-core`, audience `ugc-affiliate-os`, and a short expiry; the tenant ID is then resolved through an explicit tenant-to-workspace binding. The binding resolver rejects missing, malformed, or unknown bindings. This is the intended safer path, but its deployment mode must be enforced.

### 3. Workspace role mapping is a separate authorization requirement

`core-bound-rbac.ts` resolves a role only from an explicit workspace/user binding. This membership/role check must accompany tenant resolution; a valid tenant assertion alone is not proof that the current user belongs to that workspace. Review every protected route to confirm both permission and workspace membership are enforced before data access.

### 4. Transaction context helper is not an enforcement mechanism by itself

`withWorkspaceTransaction()` binds `app.current_workspace_id` transaction-locally. This provides context for policies to read, but because the checked-in migration chain does not enable RLS, it does not independently isolate database queries. Queries still need explicit workspace predicates until RLS has been verified and enabled.

## Recommended gate

1. Validate `CARRYOS_INTEGRATION_MODE` and all required tenant/workspace/role bindings during startup; in any multi-tenant deployment, missing or unknown mode must stop startup.
2. Add tests for missing/invalid mode, absent header, invalid signature, unknown tenant binding, missing user/workspace role, and default-workspace fallback being impossible in CORE_BOUND.
3. Add a route inventory proving permission + tenant/workspace membership checks precede reads and writes.
4. Add real PostgreSQL tests with a non-owner, non-superuser, non-`BYPASSRLS` role before enabling RLS.
5. Preserve the documented default-workspace behavior only for explicitly configured single-tenant mode.

## Assessment

**Status: PARTIAL / IMPLEMENTED_UNVERIFIED.** Token verification, tenant binding, role binding, and transaction-context helpers exist. Deployment-mode enforcement, complete route coverage, and database-level isolation have not been verified by this static review.
