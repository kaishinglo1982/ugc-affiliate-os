import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  if (!UUID_RE.test(workspaceId)) throw new Error("INVALID_WORKSPACE_ID");

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.current_workspace_id', ${workspaceId}, true)`;
    return fn(tx);
  });
}
