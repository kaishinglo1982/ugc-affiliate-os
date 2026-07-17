import type { Pool } from "pg";

import {
  WorkspaceAccessDeniedError,
  assertWorkspaceId,
  withWorkspaceTransaction,
} from "@/lib/tenancy/workspace-context";

export interface AuthenticatedPrincipal {
  userId: string;
}

export interface WorkspaceRequestContext {
  workspaceId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "OPERATOR" | "VIEWER";
}

export async function resolveWorkspaceRequestContext(input: {
  pool: Pool;
  principal: AuthenticatedPrincipal;
  requestedWorkspaceId: string;
}): Promise<WorkspaceRequestContext> {
  assertWorkspaceId(input.requestedWorkspaceId);

  return withWorkspaceTransaction(
    input.pool,
    {
      workspaceId: input.requestedWorkspaceId,
      userId: input.principal.userId,
    },
    async (client) => {
      const membership = await client.query<{ role: WorkspaceRequestContext["role"] }>(
        `SELECT "role"
         FROM "WorkspaceMember"
         WHERE "workspaceId" = $1
           AND "userId" = $2
           AND "status" = 'ACTIVE'`,
        [input.requestedWorkspaceId, input.principal.userId],
      );

      const row = membership.rows[0];
      if (!row) throw new WorkspaceAccessDeniedError();

      return {
        workspaceId: input.requestedWorkspaceId,
        userId: input.principal.userId,
        role: row.role,
      };
    },
  );
}
