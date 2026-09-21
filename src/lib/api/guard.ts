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
