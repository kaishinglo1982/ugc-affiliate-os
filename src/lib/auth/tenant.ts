import "server-only";
import { headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { DEFAULT_WORKSPACE_ID } from "@/lib/config/workspace";
import { resolveWorkspaceIdForCarryOsTenant, TenantWorkspaceBindingError } from "./carryos-workspace-binding";

const TENANT_HEADER = "x-carryos-tenant-token";
const TOKEN_ISSUER = "carryos-core";
const TOKEN_AUDIENCE = "ugc-affiliate-os";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getTenantSecretKey(): Uint8Array | null {
  const secret = process.env.CARRYOS_TENANT_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export class InvalidTenantTokenError extends Error {}

export { TenantWorkspaceBindingError };

export async function signTenantToken(tenantId: string): Promise<string> {
  const key = getTenantSecretKey();
  if (!key) throw new Error("CARRYOS_TENANT_SECRET must be set to a string of at least 32 characters");
  if (!UUID_PATTERN.test(tenantId)) throw new Error("CarryOS tenantId must be a UUID");
  return new SignJWT({ tenantId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
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
    const { payload } = await jwtVerify(token, key, {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    });
    if (typeof payload.tenantId !== "string" || !UUID_PATTERN.test(payload.tenantId)) {
      throw new InvalidTenantTokenError("Tenant token tenantId must be a UUID");
    }

    if (process.env.CARRYOS_INTEGRATION_MODE === "CORE_BOUND") {
      return resolveWorkspaceIdForCarryOsTenant(payload.tenantId);
    }

    return payload.tenantId;
  } catch (e) {
    if (e instanceof InvalidTenantTokenError || e instanceof TenantWorkspaceBindingError) throw e;
    throw new InvalidTenantTokenError("Tenant token verification failed");
  }
}
