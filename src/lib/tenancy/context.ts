import type { Pool, PoolClient } from "pg";

const WORKSPACE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class InvalidWorkspaceIdError extends Error {
  constructor(workspaceId: string) {
    super(`Invalid workspace id: ${workspaceId}`);
    this.name = "InvalidWorkspaceIdError";
  }
}

export class WorkspaceAccessDeniedError extends Error {
  constructor() {
    super("Workspace access denied.");
    this.name = "WorkspaceAccessDeniedError";
  }
}

export function assertWorkspaceId(workspaceId: string): void {
  if (!WORKSPACE_ID_PATTERN.test(workspaceId)) {
    throw new InvalidWorkspaceIdError(workspaceId);
  }
}

export interface WorkspaceTransactionContext {
  workspaceId: string;
  userId?: string;
  bypassRls?: boolean;
}

/**
 * Executes all database work inside one transaction with PostgreSQL tenant
 * settings applied through SET LOCAL semantics. RLS policies read these
 * settings and fail closed when workspace context is absent.
 */
export async function withWorkspaceTransaction<T>(
  pool: Pool,
  context: WorkspaceTransactionContext,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  assertWorkspaceId(context.workspaceId);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT set_config('app.current_workspace_id', $1, true)",
      [context.workspaceId],
    );
    await client.query(
      "SELECT set_config('app.current_user_id', $1, true)",
      [context.userId ?? ""],
    );
    await client.query(
      "SELECT set_config('app.bypass_rls', $1, true)",
      [context.bypassRls === true ? "on" : "off"],
    );

    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Verifies application-level membership before privileged workspace work. */
export async function assertWorkspaceMembership(
  client: PoolClient,
  input: { workspaceId: string; userId: string },
): Promise<void> {
  assertWorkspaceId(input.workspaceId);

  const result = await client.query<{ allowed: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM "WorkspaceMember"
       WHERE "workspaceId" = $1
         AND "userId" = $2
         AND "status" = 'ACTIVE'
     ) AS allowed`,
    [input.workspaceId, input.userId],
  );

  if (result.rows[0]?.allowed !== true) {
    throw new WorkspaceAccessDeniedError();
  }
}
