import "server-only";
import { headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { DEFAULT_WORKSPACE_ID } from "@/lib/config/workspace";
import { type TenantMode, getTenantMode } from "@/lib/tenancy/tenant-mode";

/**
 * Tenant resolution for CarryOS integration (BAND-60). When CarryOS routes a
 * request to this app on behalf of a tenant, it sets a short-lived JWT in
 * this header, signed with a secret shared out-of-band with CarryOS
 * (CARRYOS_TENANT_SECRET) — never the same key as AUTH_SECRET, which signs
 * this app's own user sessions.
 *
 * Resolution rules (Phase 70 consolidation):
 * - SINGLE_OWNER mode (default): no header = DEFAULT_WORKSPACE_ID, unchanged
 *   single-owner behavior; a present header must verify.
 * - MULTI_TENANT mode: the header is REQUIRED. Missing or invalid tokens are
 *   rejected outright — a bad/missing token means someone is trying to assert
 *   (or hide) a tenant identity, and falling back would risk running their
 *   request under the wrong (or a more privileged) workspace.
 */
const TENANT_HEADER = "x-carryos-tenant-token";

function getTenantSecretKey(): Uint8Array | null {
  const secret = process.env.CARRYOS_TENANT_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export class InvalidTenantTokenError extends Error {}

export async function signTenantToken(tenantId: string): Promise<string> {
  const key = getTenantSecretKey();
  if (!key)
    throw new Error(
      "CARRYOS_TENANT_SECRET must be set to a string of at least 32 characters",
    );
  return new SignJWT({ tenantId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(key);
}

export async function verifyTenantToken(token: string): Promise<string> {
  const key = getTenantSecretKey();
  if (!key)
    throw new InvalidTenantTokenError(
      "CARRYOS_TENANT_SECRET is not configured",
    );

  try {
    const { payload } = await jwtVerify(token, key);
    if (typeof payload.tenantId !== "string" || !payload.tenantId) {
      throw new InvalidTenantTokenError("Tenant token missing tenantId claim");
    }
    return payload.tenantId;
  } catch (e) {
    if (e instanceof InvalidTenantTokenError) throw e;
    throw new InvalidTenantTokenError("Tenant token verification failed");
  }
}

/**
 * Pure, testable tenant resolution. Single source of truth for both API
 * routes and background workers: background jobs must resolve their tenant
 * explicitly and may not fall back to a default when in MULTI_TENANT mode.
 */
export async function resolveTenantIdForRequest(input: {
  tenantToken: string | null;
  mode: TenantMode;
  defaultWorkspaceId: string | null;
}): Promise<string> {
  if (input.tenantToken) return verifyTenantToken(input.tenantToken);
  if (input.mode === "MULTI_TENANT") {
    throw new InvalidTenantTokenError(
      "Missing tenant token in multi-tenant mode",
    );
  }
  return input.defaultWorkspaceId ?? DEFAULT_WORKSPACE_ID;
}

export async function resolveTenantId(): Promise<string> {
  const store = await headers();
  const token = store.get(TENANT_HEADER);
  return resolveTenantIdForRequest({
    tenantToken: token,
    mode: getTenantMode(),
    defaultWorkspaceId: DEFAULT_WORKSPACE_ID,
  });
}

/** Backward-compatible alias; routes continue to use workspace semantics. */
export const resolveWorkspaceId = resolveTenantId;
