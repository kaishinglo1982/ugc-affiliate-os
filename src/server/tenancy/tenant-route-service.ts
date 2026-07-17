import type { Prisma, PrismaClient } from "@/generated/prisma/client";

import { WorkspaceAccessDeniedError } from "@/lib/tenancy/workspace-context";
import { withPrismaWorkspace } from "@/lib/tenancy/prisma-workspace";

export type WorkspaceRole = "OWNER" | "ADMIN" | "OPERATOR" | "VIEWER";

const ROLE_LEVEL: Record<WorkspaceRole, number> = {
  VIEWER: 10,
  OPERATOR: 20,
  ADMIN: 30,
  OWNER: 40,
};

export interface TenantRoutePrincipal {
  userId: string;
}

export interface TenantRouteContext {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
}

export async function executeTenantRoute<T>(input: {
  prisma: PrismaClient;
  principal: TenantRoutePrincipal;
  workspaceId: string;
  minimumRole?: WorkspaceRole;
  work: (
    tx: Prisma.TransactionClient,
    context: TenantRouteContext,
  ) => Promise<T>;
}): Promise<T> {
  return withPrismaWorkspace(
    input.prisma,
    {
      workspaceId: input.workspaceId,
      userId: input.principal.userId,
    },
    async (tx) => {
      const membership = await tx.workspaceMember.findFirst({
        where: {
          workspaceId: input.workspaceId,
          userId: input.principal.userId,
          status: "ACTIVE",
        },
        select: { role: true },
      });

      if (!membership) throw new WorkspaceAccessDeniedError();

      const role = membership.role as WorkspaceRole;
      const minimumRole = input.minimumRole ?? "VIEWER";
      if (ROLE_LEVEL[role] < ROLE_LEVEL[minimumRole]) {
        throw new WorkspaceAccessDeniedError();
      }

      return input.work(tx, {
        workspaceId: input.workspaceId,
        userId: input.principal.userId,
        role,
      });
    },
  );
}
