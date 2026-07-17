import type { PrismaClient } from "@/generated/prisma/client";

import { TenantHttpError, type TenantHttpIdentity } from "@/server/http/tenant-handler";

export interface AuthenticatedSession {
  userId: string;
}

export interface SessionAuthenticator {
  authenticate(request: Request): Promise<AuthenticatedSession | null>;
}

/**
 * Builds a tenant identity resolver around the existing session/auth layer.
 *
 * The authenticator may only return a verified user id. Workspace selection is
 * resolved from active memberships; request input is treated as a preference,
 * never as authorization evidence.
 */
export function createSessionIdentityResolver(input: {
  prisma: PrismaClient;
  authenticator: SessionAuthenticator;
  resolveRequestedWorkspaceId?(request: Request): string | undefined;
}) {
  return async function resolveIdentity(request: Request): Promise<TenantHttpIdentity> {
    const session = await input.authenticator.authenticate(request);
    if (!session) throw new TenantHttpError(401, "Unauthorized");

    const requestedWorkspaceId = input.resolveRequestedWorkspaceId?.(request);
    const membership = await input.prisma.workspaceMember.findFirst({
      where: {
        userId: session.userId,
        status: "ACTIVE",
        ...(requestedWorkspaceId ? { workspaceId: requestedWorkspaceId } : {}),
        workspace: { status: "ACTIVE" },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        workspaceId: true,
      },
    });

    if (!membership) throw new TenantHttpError(403, "Forbidden");

    return {
      userId: session.userId,
      workspaceId: membership.workspaceId,
    };
  };
}
