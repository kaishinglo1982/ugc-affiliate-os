import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/client";

// Shape check only (8-4-4-4-12 hex). The legacy single-tenant workspace id
// (00000000-0000-0000-0000-000000000001) is not an RFC 4122 v1-5 UUID, so
// version/variant bits must not be enforced here. External CarryOS tenant ids
// are still validated strictly in src/lib/auth/tenant.ts.
const WORKSPACE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Executes database work with the authoritative workspace/tenant bound to the
 * PostgreSQL transaction. RLS policies can consume current_setting(
 * 'app.current_workspace_id', true); the setting is scoped to this
 * transaction only.
 */
export async function withWorkspaceTransaction<T>(
  workspaceId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (!WORKSPACE_ID_RE.test(workspaceId)) throw new Error("INVALID_WORKSPACE_ID");

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.current_workspace_id', ${workspaceId}, true)`;
    return fn(tx);
  });
}
