import type { Prisma, PrismaClient } from "@/generated/prisma/client";

import { withPrismaWorkspace } from "@/lib/tenancy/prisma-workspace";

export interface TenantServiceContext {
  workspaceId: string;
  userId: string;
  correlationId?: string;
}

export interface TenantServiceExecution<T> {
  context: TenantServiceContext;
  run: (tx: Prisma.TransactionClient) => Promise<T>;
}

/**
 * Mandatory execution boundary for productive tenant-aware services.
 *
 * Services receive only Prisma.TransactionClient and therefore cannot
 * accidentally fall back to the global Prisma client while tenant context is
 * active.
 */
export async function executeTenantService<T>(
  prisma: PrismaClient,
  execution: TenantServiceExecution<T>,
): Promise<T> {
  return withPrismaWorkspace(
    prisma,
    {
      workspaceId: execution.context.workspaceId,
      userId: execution.context.userId,
    },
    execution.run,
  );
}
