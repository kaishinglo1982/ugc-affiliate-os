import { randomUUID } from "node:crypto";

import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { withWorkspaceTransaction } from "@/lib/tenancy/workspace-context";

const databaseUrl = process.env.DATABASE_URL_TEST;
const describeDb = databaseUrl ? describe : describe.skip;

async function asApplicationRole<T>(work: () => Promise<T>): Promise<T> {
  return work();
}

describeDb("workspace RLS isolation", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const workspaceA = randomUUID();
  const workspaceB = randomUUID();
  const productA = randomUUID();
  const productB = randomUUID();

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
      [productA, workspaceA, productB, workspaceB],
    );
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM "Product" WHERE "workspaceId" = ANY($1::text[])`, [[workspaceA, workspaceB]]);
    await pool.query(`DELETE FROM "Workspace" WHERE "id" = ANY($1::text[])`, [[workspaceA, workspaceB]]);
    await pool.end();
  });

  it("shows only rows for the active workspace under a non-superuser role", async () => {
    const rows = await withWorkspaceTransaction(pool, { workspaceId: workspaceA }, async (client) => {
      await client.query("SET LOCAL ROLE ugc_affiliate_app");
      return asApplicationRole(() =>
        client.query<{ workspaceId: string }>(
          `SELECT "workspaceId" FROM "Product" WHERE "id" = ANY($1::text[]) ORDER BY "workspaceId"`,
          [[productA, productB]],
        ),
      );
    });
    expect(rows.rows).toEqual([{ workspaceId: workspaceA }]);
  });

  it("blocks cross-workspace updates", async () => {
    const result = await withWorkspaceTransaction(pool, { workspaceId: workspaceA }, async (client) => {
      await client.query("SET LOCAL ROLE ugc_affiliate_app");
      return client.query(
        `UPDATE "Product" SET "canonicalName" = 'tampered' WHERE "id" = $1`,
        [productB],
      );
    });
    expect(result.rowCount).toBe(0);
  });

  it("blocks cross-workspace deletes", async () => {
    const result = await withWorkspaceTransaction(pool, { workspaceId: workspaceA }, async (client) => {
      await client.query("SET LOCAL ROLE ugc_affiliate_app");
      return client.query(`DELETE FROM "Product" WHERE "id" = $1`, [productB]);
    });
    expect(result.rowCount).toBe(0);
  });

  it("rejects inserts for a foreign workspace", async () => {
    await expect(
      withWorkspaceTransaction(pool, { workspaceId: workspaceA }, async (client) => {
        await client.query("SET LOCAL ROLE ugc_affiliate_app");
        return client.query(
          `INSERT INTO "Product" ("id", "workspaceId", "canonicalName", "name", "status", "riskLevel", "risk", "updatedAt")
           VALUES ($1, $2, 'Foreign insert', 'Foreign insert', 'DISCOVERED', 'LOW', 'LOW', NOW())`,
          [randomUUID(), workspaceB],
        );
      }),
    ).rejects.toThrow();
  });

  it("fails closed when no workspace context is set", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL ROLE ugc_affiliate_app");
      const result = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM "Product" WHERE "id" = ANY($1::text[])`,
        [[productA, productB]],
      );
      expect(result.rows[0]?.count).toBe("0");
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  });
});
