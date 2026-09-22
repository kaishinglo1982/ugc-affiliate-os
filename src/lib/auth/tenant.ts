import "server-only";
import { headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { DEFAULT_WORKSPACE_ID } from "@/lib/config/workspace";

/**
 * Tenant resolution for CarryOS integration (BAND-60). When CarryOS routes a
 * request to this app on behalf of a tenant, it sets a short-lived JWT in
 * this header, signed with a secret shared out-of-band with CarryOS
 * (CARRYOS_TENANT_SECRET) — never the same key as AUTH_SECRET, which signs
 * this app's own user sessions.
 *
 * No header at all = standalone/dev mode, unchanged single-workspace
 * behavior (DEFAULT_WORKSPACE_ID). A header that IS present but fails
 * verification is rejected outright, not silently downgraded to the
 * default — a bad signature means someone is trying to assert a tenant
 * identity, and falling back would risk running their request under the
 * wrong (or a more privileged) workspace instead of refusing it.
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
  if (!key) throw new Error("CARRYOS_TENANT_SECRET must be set to a string of at least 32 characters");
  return new SignJWT({ tenantId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(key);
}

export async function resolveWorkspaceId(): Promise<string> {
  const store = await headers();
  const token = store.get(TENANT_HEADER);
  if (!token) {
    if (process.env.CARRYOS_INTEGRATION_MODE === "CORE_BOUND") {
      throw new InvalidTenantTokenError("CarryOS tenant assertion is required in CORE_BOUND mode");
    }
    return DEFAULT_WORKSPACE_ID;
  }

  const key = getTenantSecretKey();
  if (!key) throw new InvalidTenantTokenError("CARRYOS_TENANT_SECRET is not configured");

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
