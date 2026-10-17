import type { PoolClient } from "pg";

export interface WorkspacePgPool {
  connect(): Promise<PoolClient>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertWorkspaceId(workspaceId: string): string {
  const trimmed = workspaceId.trim();
  if (!trimmed || !UUID_RE.test(trimmed)) {
    throw new Error("INVALID_WORKSPACE_ID");
  }
  return trimmed;
}

/**
 * Run work inside a PostgreSQL transaction with app.current_workspace_id set
 * on the same client. Does not authenticate the workspaceId — callers must
 * supply a trusted server-resolved value.
 */
export async function withWorkspacePgTransaction<T>(
  pool: WorkspacePgPool,
  workspaceId: string,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const id = assertWorkspaceId(workspaceId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_workspace_id', $1, true)", [
      id,
    ]);
    const check = await client.query<{ current_setting: string }>(
      "SELECT current_setting('app.current_workspace_id', true) AS current_setting",
    );
    if (check.rows[0]?.current_setting !== id) {
      throw new Error("WORKSPACE_CONTEXT_MISMATCH");
    }
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback errors
    }
    throw err;
  } finally {
    client.release();
  }
}
