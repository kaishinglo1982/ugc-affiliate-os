import "server-only";
import { headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { DEFAULT_WORKSPACE_ID } from "@/lib/config/workspace";

const TENANT_HEADER = "x-carryos-tenant-token";
const TOKEN_ISSUER = "carryos-core";
const TOKEN_AUDIENCE = "ugc-affiliate-os";
const coreTenantIdSchema = z.string().uuid();
const workspaceIdSchema = z.string().uuid();
const bindingSchema = z.record(coreTenantIdSchema, workspaceIdSchema);

type CarryOsIntegrationMode = "STANDALONE" | "CORE_BOUND";

export type CarryOsTenantContext = {
  coreTenantId: string;
  workspaceId: string;
};

function integrationMode(): CarryOsIntegrationMode {
  return process.env.CARRYOS_INTEGRATION_MODE === "CORE_BOUND" ? "CORE_BOUND" : "STANDALONE";
}

function getTenantSecretKey(): Uint8Array | null {
  const secret = process.env.CARRYOS_TENANT_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

function workspaceBindings(): Readonly<Record<string, string>> {
  const raw = process.env.CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON?.trim();
  if (!raw) return {};

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new TenantWorkspaceBindingError("CARRYOS_TENANT_WORKSPACE_BINDINGS_INVALID");
  }

  const parsed = bindingSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new TenantWorkspaceBindingError("CARRYOS_TENANT_WORKSPACE_BINDINGS_INVALID");
  }
  return parsed.data;
}

export class InvalidTenantTokenError extends Error {}
export class TenantWorkspaceBindingError extends Error {}

/** Test/dev helper only. Production UGC is verification-only. */
export async function signTenantToken(tenantId: string): Promise<string> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("UGC must not mint CarryOS tenant assertions in production");
  }
  const parsedTenantId = coreTenantIdSchema.safeParse(tenantId);
  if (!parsedTenantId.success) throw new Error("CarryOS tenantId must be a UUID");

  const key = getTenantSecretKey();
  if (!key) throw new Error("CARRYOS_TENANT_SECRET must be set to a string of at least 32 characters");
  return new SignJWT({ tenantId: parsedTenantId.data })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(key);
}

export async function resolveCarryOsTenantContext(): Promise<CarryOsTenantContext | null> {
  const store = await headers();
  const token = store.get(TENANT_HEADER);
  const mode = integrationMode();

  if (!token) {
    if (mode === "CORE_BOUND") {
      throw new InvalidTenantTokenError("CarryOS tenant assertion required in CORE_BOUND mode");
    }
    return null;
  }

  const key = getTenantSecretKey();
  if (!key) throw new InvalidTenantTokenError("CARRYOS_TENANT_SECRET is not configured");

  let coreTenantId: string;
  try {
    const { payload } = await jwtVerify(token, key, {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    });
    const parsedTenantId = coreTenantIdSchema.safeParse(payload.tenantId);
    if (!parsedTenantId.success) {
      throw new InvalidTenantTokenError("Tenant token missing valid CarryOS tenant UUID");
    }
    coreTenantId = parsedTenantId.data;
  } catch (error) {
    if (error instanceof InvalidTenantTokenError) throw error;
    throw new InvalidTenantTokenError("Tenant token verification failed");
  }

  const workspaceId = workspaceBindings()[coreTenantId];
  if (!workspaceId) {
    throw new TenantWorkspaceBindingError("CARRYOS_TENANT_WORKSPACE_BINDING_NOT_CONFIGURED");
  }
  return { coreTenantId, workspaceId };
}

export async function resolveWorkspaceId(): Promise<string> {
  const context = await resolveCarryOsTenantContext();
  return context?.workspaceId ?? DEFAULT_WORKSPACE_ID;
}
