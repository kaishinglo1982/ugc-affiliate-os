import type { Prisma, PrismaClient } from "@/generated/prisma/client";

import {
  executeTenantRoute,
  type TenantRouteContext,
  type WorkspaceRole,
} from "@/server/tenancy/tenant-route-service";

export interface TenantHttpIdentity {
  userId: string;
  workspaceId: string;
}

export interface TenantHandlerDependencies {
  prisma: PrismaClient;
  resolveIdentity(request: Request): Promise<TenantHttpIdentity>;
}

export class TenantHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "TenantHttpError";
  }
}

export type TenantHttpWork<T> = (
  request: Request,
  tx: Prisma.TransactionClient,
  context: TenantRouteContext,
) => Promise<T>;

export function createTenantHandler<T>(
  dependencies: TenantHandlerDependencies,
  minimumRole: WorkspaceRole,
  handle: TenantHttpWork<T>,
) {
  return async function tenantHandler(request: Request): Promise<Response> {
    try {
      const identity = await dependencies.resolveIdentity(request);
      const data = await executeTenantRoute({
        prisma: dependencies.prisma,
        principal: { userId: identity.userId },
        workspaceId: identity.workspaceId,
        minimumRole,
        work: (tx, context) => handle(request, tx, context),
      });
      return Response.json({ data });
    } catch (error) {
      if (error instanceof TenantHttpError) {
        return Response.json({ error: error.message }, { status: error.status });
      }
      const message = error instanceof Error ? error.message : "Request failed";
      const status = message.includes("Workspace access denied") ? 403 : 500;
      return Response.json(
        { error: status === 403 ? "Forbidden" : "Internal server error" },
        { status },
      );
    }
  };
}
