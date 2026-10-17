import { describe, expect, it, vi } from "vitest";

import { withWorkspacePgTransaction } from "@/lib/db/workspace-pg-transaction";

const WORKSPACE_A = "11111111-1111-4111-8111-111111111111";

function createFakePool(bindingValue = WORKSPACE_A) {
  const queries: Array<{ sql: string; values?: readonly unknown[] }> = [];
  const client = {
    query: vi.fn(async (sql: string, values?: readonly unknown[]) => {
      queries.push({ sql, values });
      if (sql.includes("set_config('app.current_workspace_id'")) {
        return { rows: [{ workspaceId: bindingValue }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    }),
    release: vi.fn(),
  };
  const pool = { connect: vi.fn(async () => client) };
  return { pool, client, queries };
}

describe("withWorkspacePgTransaction", () => {
  it("binds workspace context on the same client before tenant SQL and commits", async () => {
    const { pool, client, queries } = createFakePool();

    const result = await withWorkspacePgTransaction(pool as never, WORKSPACE_A, async (tx) => {
      expect(tx).toBe(client);
      await tx.query('SELECT * FROM tenant_owned_table WHERE "workspaceId" = $1', [WORKSPACE_A]);
      return "done";
    });

    expect(result).toBe("done");
    expect(pool.connect).toHaveBeenCalledTimes(1);
    expect(queries.map((query) => query.sql)).toEqual([
      "BEGIN",
      'SELECT set_config(\'app.current_workspace_id\', $1, true) AS "workspaceId"',
      'SELECT * FROM tenant_owned_table WHERE "workspaceId" = $1',
      "COMMIT",
    ]);
    expect(queries[1]?.values).toEqual([WORKSPACE_A]);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid workspace IDs before acquiring a connection", async () => {
    const { pool } = createFakePool();

    await expect(withWorkspacePgTransaction(pool as never, "not-a-uuid", async () => undefined))
      .rejects.toThrow("INVALID_WORKSPACE_ID");
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it("rolls back and releases the client when tenant work fails", async () => {
    const { pool, client, queries } = createFakePool();

    await expect(
      withWorkspacePgTransaction(pool as never, WORKSPACE_A, async () => {
        throw new Error("query failed");
      }),
    ).rejects.toThrow("query failed");

    expect(queries.map((query) => query.sql)).toEqual([
      "BEGIN",
      'SELECT set_config(\'app.current_workspace_id\', $1, true) AS "workspaceId"',
      "ROLLBACK",
    ]);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("rolls back if PostgreSQL does not return the requested workspace binding", async () => {
    const { pool, client, queries } = createFakePool("22222222-2222-4222-8222-222222222222");

    await expect(
      withWorkspacePgTransaction(pool as never, WORKSPACE_A, async () => undefined),
    ).rejects.toThrow("WORKSPACE_CONTEXT_BINDING_FAILED");

    expect(queries.map((query) => query.sql)).toEqual([
      "BEGIN",
      'SELECT set_config(\'app.current_workspace_id\', $1, true) AS "workspaceId"',
      "ROLLBACK",
    ]);
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
