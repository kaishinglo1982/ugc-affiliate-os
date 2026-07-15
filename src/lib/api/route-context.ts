import { NextResponse } from "next/server";
import { requireApiPermission } from "./guard";
import { unauthorized } from "./response";
import { Permission } from "@/lib/auth/rbac";
import {
  InvalidTenantTokenError,
  resolveWorkspaceId,
} from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";

export type { Permission } from "@/lib/auth/rbac";

/**
 * Resolved security context for a route handler: the authenticated user's id,
 * the resolved workspace/tenant id, and the permission that was authorized.
 *
 * Routes that need tenant isolation call `withApiContext` instead of
 * re-implementing the inline `requireApiPermission` + `resolveWorkspaceId`
 * dance that was duplicated across every handler. This keeps auth/tenant
 * boilerplate out of route handlers so they only orchestrate service calls.
 */
export type ApiContext = {
  actor: string;
  workspaceId: string;
};

export type ApiContextResult =
  | { context: ApiContext }
  | { response: NextResponse };

/**
 * Authorize the request (permission + tenant token) and resolve the
 * workspace/tenant id and actor id in one step.
 *
 * Returns `{ context }` when the caller may proceed, or `{ response }`
 * (a unified envelope from `response.ts`) when unauthorized. The caller must
 * `return result.response` when present.
 *
 * This wraps the existing `requireApiPermission` guard (it is not a parallel
 * auth module) and layers tenant isolation on top, exactly as documented in
 * `guard.ts`.
 */
export async function withApiContext(
  permission: Permission,
): Promise<ApiContextResult> {
  const guard = await requireApiPermission(permission);
  if (guard) return { response: guard.response };

  let workspaceId: string;
  try {
    workspaceId = await resolveWorkspaceId();
  } catch (e) {
    if (e instanceof InvalidTenantTokenError) {
      return { response: unauthorized("Ungültiges Tenant-Token.") };
    }
    throw e;
  }

  const actor = (await getCurrentUser())?.id ?? "owner";
  return { context: { actor, workspaceId } };
}
