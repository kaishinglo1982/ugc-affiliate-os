import type { PrismaClient } from "@/generated/prisma/client";

import { assertWorkspaceId } from "@/lib/tenancy/workspace-context";

type TransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export interface PrismaWorkspaceContext {
  workspaceId: string;
  userId?: string;
}

/**
 * Canonical Prisma boundary for tenant-scoped application services.
 *
 * Every callback executes in a single database transaction. PostgreSQL RLS and
 * insert guards consume the transaction-local settings established here.
 */
export async function withPrismaWorkspace<T>(
  prisma: PrismaClient,
  context: PrismaWorkspaceContext,
  work: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
  assertWorkspaceId(context.workspaceId);

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_workspace_id', ${context.workspaceId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${context.userId ?? ""}, true)`;
    await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;

    return work(tx);
  });
}
