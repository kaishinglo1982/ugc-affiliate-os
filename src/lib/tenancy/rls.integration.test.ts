import { randomUUID } from "node:crypto";

import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { withWorkspaceTransaction } from "@/lib/tenancy/workspace-context";

const databaseUrl = process.env.DATABASE_URL_TEST;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb("workspace RLS isolation", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const workspaceA = randomUUID();
  const workspaceB = randomUUID();

  beforeAll(async () => {
    await pool.query(
      `INSERT INTO "Workspace" ("id", "slug", "name", "status") VALUES
       ($1, $2, 'Workspace A', 'ACTIVE'), ($3, $4, 'Workspace B', 'ACTIVE')`,
      [workspaceA, `a-${workspaceA}`, workspaceB, `b-${workspaceB}`],
    );
    await pool.query(
      `INSERT INTO "Product" ("id", "workspaceId", "canonicalName", "name", "status", "riskLevel", "risk", "updatedAt")
       VALUES ($1, $2, 'A product', 'A product', 'DISCOVERED', 'LOW', 'LOW', NOW()),
              ($3, $4, 'B product', 'B product', 'DISCOVERED', 'LOW', 'LOW', NOW())`,
      [randomUUID(), workspaceA, randomUUID(), workspaceB],
    );
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM "Product" WHERE "workspaceId" = ANY($1::text[])`, [[workspaceA, workspaceB]]);
    await pool.query(`DELETE FROM "Workspace" WHERE "id" = ANY($1::text[])`, [[workspaceA, workspaceB]]);
    await pool.end();
  });

  it("shows only rows for the active workspace", async () => {
    const rows = await withWorkspaceTransaction(pool, { workspaceId: workspaceA }, async (client) =>
      client.query<{ workspaceId: string }>(`SELECT "workspaceId" FROM "Product" ORDER BY "workspaceId"`),
    );
    expect(rows.rows).toEqual([{ workspaceId: workspaceA }]);
  });

  it("blocks cross-workspace updates", async () => {
    const result = await withWorkspaceTransaction(pool, { workspaceId: workspaceA }, async (client) =>
      client.query(`UPDATE "Product" SET "canonicalName" = 'tampered' WHERE "workspaceId" = $1`, [workspaceB]),
    );
    expect(result.rowCount).toBe(0);
  });
});
