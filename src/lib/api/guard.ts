import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hasPermission, type Permission } from "@/lib/auth/rbac";
import { forbidden, unauthorized } from "./response";

/**
 * Shared guard for API route handlers. Verifies authentication and the required
 * server-side permission (UI hiding never replaces this). Returns a 401/403
 * response when unauthorized, or `null` when the caller may proceed. Every
 * mutation route must also write an audit event.
 *
 * Tenant resolution is layered on top by `withApiContext()`. Keeping this
 * guard's return contract stable avoids breaking existing callers while still
 * ensuring every rejection uses the canonical API envelope.
 */
export async function requireApiPermission(
  permission: string,
): Promise<{ response: NextResponse } | null> {
  const user = await getCurrentUser();
  if (!user) {
    return { response: unauthorized() };
  }
  if (!hasPermission(user, permission as Permission)) {
    return { response: forbidden() };
  }
  return null;
}
