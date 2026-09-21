import "server-only";
import { headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { DEFAULT_WORKSPACE_ID } from "@/lib/config/workspace";
import { prisma } from "@/lib/db/client";

const TENANT_HEADER = "x-carryos-tenant-token";

function getTenantSecretKey(): Uint8Array | null {
  const secret = process.env.CARRYOS_TENANT_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export class InvalidTenantTokenError extends Error {}
export class TenantWorkspaceBindingError extends Error {}

export interface CarryOSTenantContext {
  tenantId: string;
  workspaceId: string;
  scope?: string;
  capabilities: string[];
}

export async function signTenantToken(
  tenantId: string,
  options?: { scope?: string; capabilities?: string[] },
): Promise<string> {
  const key = getTenantSecretKey();
  if (!key) throw new Error("CARRYOS_TENANT_SECRET must be set to a string of at least 32 characters");
  return new SignJWT({
    tenantId,
    scope: options?.scope,
    capabilities: options?.capabilities ?? [],
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(key);
}

export async function resolveCarryOSTenantContext(): Promise<CarryOSTenantContext | null> {
  const store = await headers();
  const token = store.get(TENANT_HEADER);
  if (!token) return null;

  const key = getTenantSecretKey();
  if (!key) throw new InvalidTenantTokenError("CARRYOS_TENANT_SECRET is not configured");

  try {
    const { payload } = await jwtVerify(token, key);
    if (typeof payload.tenantId !== "string" || !payload.tenantId) {
      throw new InvalidTenantTokenError("Tenant token missing tenantId claim");
    }

    const binding = await prisma.carryOSTenantBinding.findUnique({
      where: { tenantId: payload.tenantId },
      select: { workspaceId: true, active: true },
    });
    if (!binding?.active) {
      throw new TenantWorkspaceBindingError("CarryOS tenant is not bound to an active UGC workspace");
    }

    const capabilities = Array.isArray(payload.capabilities)
      ? payload.capabilities.filter((value): value is string => typeof value === "string")
      : [];

    return {
      tenantId: payload.tenantId,
      workspaceId: binding.workspaceId,
      scope: typeof payload.scope === "string" ? payload.scope : undefined,
      capabilities,
    };
  } catch (error) {
    if (error instanceof InvalidTenantTokenError || error instanceof TenantWorkspaceBindingError) {
      throw error;
    }
    throw new InvalidTenantTokenError("Tenant token verification failed");
  }
}

export async function resolveWorkspaceId(): Promise<string> {
  const context = await resolveCarryOSTenantContext();
  return context?.workspaceId ?? DEFAULT_WORKSPACE_ID;
}
