import "server-only";
import { headers } from "next/headers";
import { jwtVerify } from "jose";

const TENANT_HEADER = "x-carryos-tenant-token";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class CarryOsTenantContextError extends Error {}

function getTenantSecretKey(): Uint8Array {
  const secret = process.env.CARRYOS_TENANT_SECRET;
  if (!secret || secret.length < 32) {
    throw new CarryOsTenantContextError("CARRYOS_TENANT_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Resolves the authenticated CarryOS tenant identity.
 *
 * This is deliberately separate from UGC's local workspace identity. A future
 * authoritative Tenant -> Workspace mapping must consume this value before
 * local workspace-scoped repositories are queried.
 */
export async function resolveCarryOsTenantId(): Promise<string> {
  const token = (await headers()).get(TENANT_HEADER);
  if (!token) {
    throw new CarryOsTenantContextError("CarryOS tenant assertion is required");
  }

  try {
    const { payload } = await jwtVerify(token, getTenantSecretKey());
    if (typeof payload.tenantId !== "string" || !UUID_PATTERN.test(payload.tenantId)) {
      throw new CarryOsTenantContextError("Tenant token tenantId must be a UUID");
    }
    return payload.tenantId;
  } catch (error) {
    if (error instanceof CarryOsTenantContextError) throw error;
    throw new CarryOsTenantContextError("Tenant token verification failed");
  }
}
