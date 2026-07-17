import type { PrismaClient } from "@/generated/prisma/client";

import {
  executeTenantRoute,
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

export function createTenantHandler(
  dependencies: TenantHandlerDependencies,
  minimumRole: WorkspaceRole,
  handle: Parameters<typeof executeTenantRoute>[0]["work"],
) {
  return async function tenantHandler(request: Request): Promise<Response> {
    try {
      const identity = await dependencies.resolveIdentity(request);
      const data = await executeTenantRoute({
        prisma: dependencies.prisma,
        principal: { userId: identity.userId },
        workspaceId: identity.workspaceId,
        minimumRole,
        work: handle,
      });
      return Response.json({ data });
    } catch (error) {
      if (error instanceof TenantHttpError) {
        return Response.json({ error: error.message }, { status: error.status });
      }
      const message = error instanceof Error ? error.message : "Request failed";
      const status = message.includes("Workspace access denied") ? 403 : 500;
      return Response.json({ error: status === 403 ? "Forbidden" : "Internal server error" }, { status });
    }
  };
}
