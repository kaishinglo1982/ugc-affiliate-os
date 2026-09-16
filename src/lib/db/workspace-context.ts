import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { prisma } from "@/lib/db/client";

export type WorkspaceTransaction = Prisma.TransactionClient;

/**
 * Execute tenant-owned database work inside one PostgreSQL transaction and
 * bind the active workspace to a LOCAL custom setting. RLS policies read the
 * same setting, so it cannot leak to another pooled connection/transaction.
 */
export async function withWorkspaceDb<T>(
  callback: (tx: WorkspaceTransaction, workspaceId: string) => Promise<T>,
  workspaceIdOverride?: string,
): Promise<T> {
  const workspaceId = workspaceIdOverride ?? (await resolveWorkspaceId());

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.workspace_id', ${workspaceId}, true)`;
    return callback(tx, workspaceId);
  });
}
