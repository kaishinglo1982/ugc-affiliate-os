/**
 * Tenant operating mode (Phase 70 consolidation).
 *
 * Two modes inside one application:
 * - SINGLE_OWNER: one controlled default tenant (DEFAULT_WORKSPACE_ID). No
 *   tenant token required; a valid CarryOS tenant token is still honored.
 * - MULTI_TENANT: every request must resolve to an explicit, verified tenant
 *   (fail-closed: missing or invalid tokens are rejected, never downgraded).
 */
export type TenantMode = "SINGLE_OWNER" | "MULTI_TENANT";

export const TENANT_MODE_ENV = "APP_TENANT_MODE";

export function parseTenantMode(value: string | undefined): TenantMode {
  if (value === undefined || value === "") return "SINGLE_OWNER";
  if (value === "SINGLE_OWNER" || value === "MULTI_TENANT") return value;
  throw new Error(
    `Invalid ${TENANT_MODE_ENV} "${value}": expected SINGLE_OWNER or MULTI_TENANT`,
  );
}

export function getTenantMode(): TenantMode {
  return parseTenantMode(process.env[TENANT_MODE_ENV]);
}
