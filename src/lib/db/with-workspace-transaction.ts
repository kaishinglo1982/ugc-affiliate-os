import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./client";

/**
 * Runs database work in a transaction with a transaction-local workspace context.
 *
 * SECURITY CONTRACT:
 * - workspaceId MUST come from server-side authentication/authorization, never
 *   directly from a request body, query parameter, or client-controlled header.
 * - All tenant-owned database operations inside the callback MUST use the
 *   supplied transaction client (tx), not the global prisma client.
 * - The third argument to set_config is true, so the setting is local to this
 *   transaction and cannot leak through a pooled connection after commit/rollback.
 *
 * This helper is a prerequisite for enabling PostgreSQL RLS. It does not itself
 * enable RLS, and callers must still authorize workspace membership.
 */
export async function withWorkspaceTransaction<T>(
  workspaceId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (typeof workspaceId !== "string" || workspaceId.trim().length === 0) {
    throw new Error("WORKSPACE_CONTEXT_REQUIRED");
  }

  if (workspaceId !== workspaceId.trim()) {
    throw new Error("WORKSPACE_CONTEXT_INVALID");
  }

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ current_workspace_id: string }>>`
      SELECT set_config('app.current_workspace_id', ${workspaceId}, true)
        AS current_workspace_id
    `;

    if (rows[0]?.current_workspace_id !== workspaceId) {
      throw new Error("WORKSPACE_CONTEXT_NOT_ESTABLISHED");
    }

    return work(tx);
  });
}
