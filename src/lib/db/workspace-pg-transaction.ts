import type { PoolClient } from "pg";

export interface WorkspacePgPool {
  connect(): Promise<PoolClient>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Run raw PostgreSQL work in one transaction with a transaction-local,
 * server-bound workspace context. Tenant-owned queries in the callback must
 * use the provided client; never fall back to pool.query().
 */
export async function withWorkspacePgTransaction<T>(
  pool: WorkspacePgPool,
  workspaceId: string,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  if (!UUID_RE.test(workspaceId)) throw new Error("INVALID_WORKSPACE_ID");

  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;
    const binding = await client.query<{ workspaceId: string }>(
      "SELECT set_config('app.current_workspace_id', $1, true) AS \"workspaceId\"",
      [workspaceId],
    );
    if (binding.rows[0]?.workspaceId !== workspaceId) {
      throw new Error("WORKSPACE_CONTEXT_BINDING_FAILED");
    }

    const result = await work(client);
    await client.query("COMMIT");
    transactionOpen = false;
    return result;
  } catch (error) {
    if (transactionOpen) await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
