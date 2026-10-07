import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hasPermission, type Permission } from "@/lib/auth/rbac";
import { newRequestId } from "@/types/result";
import { CarryOsPluginBindingError, requireCarryOsUgcBinding } from "@/lib/auth/carryos-plugin-binding";

/**
 * Shared guard for API route handlers. Verifies authentication and the required
 * server-side permission (UI hiding never replaces this). Returns a 401/403
 * response when unauthorized, or `null` when the caller may proceed. Every
 * mutation route must also write an audit event.
 *
 * Tenant resolution (BAND-60) is a separate concern — call
 * `resolveWorkspaceId()` from `@/lib/auth/tenant` in routes that need it,
 * after this guard passes. Keeping them separate avoids changing this
 * function's return contract for all ~95 callers, most of which don't read
 * tenant-scoped data.
 */
export async function requireApiPermission(
  permission: string,
): Promise<{ response: NextResponse } | null> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) {
    return { response: NextResponse.json({ error: "Nicht authentifiziert.", requestId }, { status: 401 }) };
  }
  if (!hasPermission(user, permission as Permission)) {
    return { response: NextResponse.json({ error: "Keine Berechtigung.", requestId }, { status: 403 }) };
  }
  return null;
}
