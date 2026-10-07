import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * All workspace-scoped persistence MUST execute through this transaction.
 * The PostgreSQL setting is LOCAL/transaction-scoped and therefore cannot
 * leak through the shared connection pool.
 */
export async function withWorkspaceTransaction<T>(
  workspaceId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (!UUID_RE.test(workspaceId)) throw new Error("INVALID_WORKSPACE_ID");

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.current_workspace_id', ${workspaceId}, true)`;
    return fn(tx);
  });
}
