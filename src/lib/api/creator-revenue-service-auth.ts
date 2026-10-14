import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { jwtVerify } from "jose";
import type { NextResponse } from "next/server";
import { fail, unauthorized } from "@/lib/api/response";
import { resolveWorkspaceIdForCarryOsTenant } from "@/lib/auth/carryos-workspace-binding";

const MIN_TOKEN_LENGTH = 32;

export type CreatorRevenueServiceContext = {
  clientId: "creator-revenue-o";
  workspaceId: string;
  tenantId: string;
};

export type CreatorRevenueServiceAuthResult =
  | { ok: true; context: CreatorRevenueServiceContext }
  | { ok: false; response: NextResponse };

function secureEqual(actual: string, expected: string): boolean {
  const actualDigest = createHash("sha256").update(actual).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actualDigest, expectedDigest);
}

export async function authorizeCreatorRevenueService(request: Request): Promise<CreatorRevenueServiceAuthResult> {
  const tenantAssertion = request.headers.get("x-carryos-tenant-token")?.trim();
  if (!tenantAssertion) return { ok: false, response: unauthorized("TENANT_ASSERTION_REQUIRED") };

  const tenantSecret = process.env.CARRYOS_TENANT_SECRET?.trim();
  if (!tenantSecret || tenantSecret.length < 32) {
    return { ok: false, response: fail("CARRYOS_TENANT_SECRET_NOT_CONFIGURED", { status: 503 }) };
  }

  let tenantId = "";
  try {
    const { payload } = await jwtVerify(tenantAssertion, new TextEncoder().encode(tenantSecret), {
      issuer: "carryos-core",
      audience: "ugc-affiliate-os",
    });
    if (typeof payload.tenantId !== "string") throw new Error("TENANT_ASSERTION_INVALID");
    tenantId = payload.tenantId;
  } catch {
    return { ok: false, response: unauthorized("TENANT_ASSERTION_INVALID") };
  }

  const raw = process.env.UGC_SERVICE_CREDENTIALS_JSON?.trim();
  if (!raw) return { ok: false, response: fail("UGC_SERVICE_CREDENTIALS_NOT_CONFIGURED", { status: 503 }) };

  let credentials: Record<string, unknown>;
  try { credentials = JSON.parse(raw) as Record<string, unknown>; }
  catch { return { ok: false, response: fail("UGC_SERVICE_CREDENTIALS_INVALID", { status: 503 }) }; }

  const entry = credentials[tenantId];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return { ok: false, response: fail("UGC_SERVICE_CREDENTIAL_NOT_CONFIGURED", { status: 503 }) };
  }
  const configured = entry as { enabled?: boolean; token?: string; expiresAt?: string };
  if (configured.enabled !== true || typeof configured.token !== "string" || configured.token.length < MIN_TOKEN_LENGTH) {
    return { ok: false, response: fail("UGC_SERVICE_CREDENTIAL_INVALID", { status: 503 }) };
  }
  if (typeof configured.expiresAt !== "string" || Number.isNaN(Date.parse(configured.expiresAt)) || Date.parse(configured.expiresAt) <= Date.now()) {
    return { ok: false, response: fail("UGC_SERVICE_CREDENTIAL_EXPIRED", { status: 503 }) };
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return { ok: false, response: unauthorized("UNAUTHORIZED") };
  const actualToken = authorization.slice("Bearer ".length).trim();
  if (!actualToken || !secureEqual(actualToken, configured.token)) {
    return { ok: false, response: unauthorized("UNAUTHORIZED") };
  }

  if (request.headers.has("x-workspace-id") || request.headers.has("x-tenant-id")) {
    return { ok: false, response: fail("WORKSPACE_HEADER_NOT_ALLOWED", { status: 400 }) };
  }

  let workspaceId: string;
  try { workspaceId = await resolveWorkspaceIdForCarryOsTenant(tenantId); }
  catch { return { ok: false, response: fail("TENANT_WORKSPACE_NOT_BOUND", { status: 403 }) }; }

  return { ok: true, context: { clientId: "creator-revenue-o", workspaceId, tenantId } };
}
