import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_WORKSPACE_ID } from "@/lib/config/workspace";
import { fail, unauthorized } from "@/lib/api/response";

const MIN_TOKEN_LENGTH = 32;
const workspaceIdSchema = z.string().uuid();

export type CreatorRevenueServiceContext = {
  clientId: "creator-revenue-o";
  workspaceId: string;
};

export type CreatorRevenueServiceAuthResult =
  | { ok: true; context: CreatorRevenueServiceContext }
  | { ok: false; response: NextResponse };

function secureEqual(actual: string, expected: string): boolean {
  const actualDigest = createHash("sha256").update(actual).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actualDigest, expectedDigest);
}

function resolvePinnedWorkspaceId(): string | null {
  const configured = process.env.UGC_CREATOR_REVENUE_WORKSPACE_ID?.trim();
  if (configured) {
    const parsed = workspaceIdSchema.safeParse(configured);
    return parsed.success ? parsed.data : null;
  }

  if (process.env.CARRYOS_INTEGRATION_MODE === "CORE_BOUND") {
    return null;
  }

  return DEFAULT_WORKSPACE_ID;
}

export function authorizeCreatorRevenueService(request: Request): CreatorRevenueServiceAuthResult {
  const expectedToken = process.env.UGC_SERVICE_TOKEN?.trim();
  if (!expectedToken || expectedToken.length < MIN_TOKEN_LENGTH) {
    return {
      ok: false,
      response: fail("CREATOR_REVENUE_S2S_NOT_CONFIGURED", { status: 503 }),
    };
  }

  const workspaceId = resolvePinnedWorkspaceId();
  if (!workspaceId) {
    return {
      ok: false,
      response: fail("CREATOR_REVENUE_WORKSPACE_NOT_CONFIGURED", { status: 503 }),
    };
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return { ok: false, response: unauthorized("UNAUTHORIZED") };
  }

  const actualToken = authorization.slice("Bearer ".length).trim();
  if (!actualToken || !secureEqual(actualToken, expectedToken)) {
    return { ok: false, response: unauthorized("UNAUTHORIZED") };
  }

  if (
    request.headers.has("x-workspace-id") ||
    request.headers.has("x-tenant-id") ||
    request.headers.has("x-carryos-tenant-token")
  ) {
    return {
      ok: false,
      response: fail("WORKSPACE_HEADER_NOT_ALLOWED", { status: 400 }),
    };
  }

  return {
    ok: true,
    context: {
      clientId: "creator-revenue-o",
      workspaceId,
    },
  };
}
