import { randomUUID } from "node:crypto";

import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { withWorkspaceTransaction } from "@/lib/tenancy/workspace-context";

const databaseUrl = process.env.DATABASE_URL_TEST;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb("core domain workspace isolation", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const workspaceA = randomUUID();
  const workspaceB = randomUUID();
  const campaignA = randomUUID();
  const campaignB = randomUUID();
  const programA = randomUUID();
  const programB = randomUUID();

  beforeAll(async () => {
    await pool.query(
      `INSERT INTO "Workspace" ("id", "slug", "name", "status") VALUES
       ($1, $2, 'Core A', 'ACTIVE'), ($3, $4, 'Core B', 'ACTIVE')`,
      [workspaceA, `core-a-${workspaceA}`, workspaceB, `core-b-${workspaceB}`],
    );

    await pool.query(
      `INSERT INTO "Campaign" ("id", "workspaceId", "name", "status", "updatedAt") VALUES
       ($1, $2, 'Campaign A', 'DRAFT', NOW()),
       ($3, $4, 'Campaign B', 'DRAFT', NOW())`,
      [campaignA, workspaceA, campaignB, workspaceB],
    );

    await pool.query(
      `INSERT INTO "AffiliateProgram" ("id", "workspaceId", "provider", "mode", "status", "updatedAt") VALUES
       ($1, $2, 'CUSTOM', 'MOCK', 'CONNECTED', NOW()),
       ($3, $4, 'CUSTOM', 'MOCK', 'CONNECTED', NOW())`,
      [programA, workspaceA, programB, workspaceB],
    );
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM "Campaign" WHERE "id" = ANY($1::text[])`, [[campaignA, campaignB]]);
    await pool.query(`DELETE FROM "AffiliateProgram" WHERE "id" = ANY($1::text[])`, [[programA, programB]]);
    await pool.query(`DELETE FROM "Workspace" WHERE "id" = ANY($1::text[])`, [[workspaceA, workspaceB]]);
    await pool.end();
  });

  it("isolates campaign reads", async () => {
    const result = await withWorkspaceTransaction(pool, { workspaceId: workspaceA }, async (client) => {
      await client.query("SET LOCAL ROLE ugc_affiliate_app");
      return client.query<{ id: string }>(
        `SELECT "id" FROM "Campaign" WHERE "id" = ANY($1::text[]) ORDER BY "id"`,
        [[campaignA, campaignB]],
      );
    });

    expect(result.rows).toEqual([{ id: campaignA }]);
  });

  it("isolates affiliate program reads", async () => {
    const result = await withWorkspaceTransaction(pool, { workspaceId: workspaceB }, async (client) => {
      await client.query("SET LOCAL ROLE ugc_affiliate_app");
      return client.query<{ id: string }>(
        `SELECT "id" FROM "AffiliateProgram" WHERE "id" = ANY($1::text[]) ORDER BY "id"`,
        [[programA, programB]],
      );
    });

    expect(result.rows).toEqual([{ id: programB }]);
  });

  it("blocks cross-workspace campaign mutation", async () => {
    const result = await withWorkspaceTransaction(pool, { workspaceId: workspaceA }, async (client) => {
      await client.query("SET LOCAL ROLE ugc_affiliate_app");
      return client.query(`UPDATE "Campaign" SET "name" = 'blocked' WHERE "id" = $1`, [campaignB]);
    });

    expect(result.rowCount).toBe(0);
  });
});