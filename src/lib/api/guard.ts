import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hasPermission, permissionsForRole, type Permission } from "@/lib/auth/rbac";
import {
  InvalidTenantTokenError,
  TenantWorkspaceBindingError,
  resolveWorkspaceId,
} from "@/lib/auth/tenant";
import {
  CoreBoundRoleBindingError,
  resolveCoreBoundRole,
} from "@/lib/auth/core-bound-rbac";
import { newRequestId } from "@/types/result";

/**
 * Shared guard for API route handlers. Verifies authentication and the required
 * server-side permission (UI hiding never replaces this). Returns a 401/403
 * response when unauthorized, or `null` when the caller may proceed.
 *
 * In STANDALONE mode the legacy single-user owner model remains compatible.
 * In CORE_BOUND mode tenant assertion, tenant->workspace binding and an
 * explicit workspace-scoped user role are all required before permission
 * evaluation. Missing context fails closed; there is no implicit owner role.
 */
export async function requireApiPermission(
  permission: string,
): Promise<{ response: NextResponse } | null> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) {
    return { response: NextResponse.json({ error: "Nicht authentifiziert.", requestId }, { status: 401 }) };
  }

  if (process.env.CARRYOS_INTEGRATION_MODE === "CORE_BOUND") {
    try {
      const workspaceId = await resolveWorkspaceId();
      const role = resolveCoreBoundRole(workspaceId, user.id);
      if (!permissionsForRole(role).has(permission as Permission)) {
        return { response: NextResponse.json({ error: "Keine Berechtigung.", requestId }, { status: 403 }) };
      }
      return null;
    } catch (error) {
      if (error instanceof InvalidTenantTokenError) {
        return {
          response: NextResponse.json(
            { error: "Ungültige CarryOS Tenant-Assertion.", requestId },
            { status: 401 },
          ),
        };
      }
      if (error instanceof TenantWorkspaceBindingError || error instanceof CoreBoundRoleBindingError) {
        return {
          response: NextResponse.json(
            { error: "Keine Berechtigung für diesen Workspace.", requestId },
            { status: 403 },
          ),
        };
      }
      throw error;
    }
  }

  if (!hasPermission(user, permission as Permission)) {
    return { response: NextResponse.json({ error: "Keine Berechtigung.", requestId }, { status: 403 }) };
  }
  return null;
}
