import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
const runDatabaseTest = Boolean(process.env.CI && databaseUrl);

let client: Client;

describe.runIf(runDatabaseTest)("workspace RLS schema completeness", () => {
  beforeAll(async () => {
    client = new Client({ connectionString: databaseUrl });
    await client.connect();
  });

  afterAll(async () => {
    if (client) await client.end();
  });

  it("enables RLS on every public table with a workspaceId column", async () => {
    const result = await client.query<{
      table_name: string;
      rls_enabled: boolean;
      policy_count: string;
    }>(`
      SELECT
        c.relname AS table_name,
        c.relrowsecurity AS rls_enabled,
        COUNT(p.polname)::text AS policy_count
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN information_schema.columns col
        ON col.table_schema = n.nspname
       AND col.table_name = c.relname
       AND col.column_name = 'workspaceId'
      LEFT JOIN pg_policy p ON p.polrelid = c.oid
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
      GROUP BY c.oid, c.relname, c.relrowsecurity
      ORDER BY c.relname
    `);

    expect(result.rows.length).toBeGreaterThan(0);

    const withoutRls = result.rows.filter((row) => !row.rls_enabled);
    const withoutPolicy = result.rows.filter((row) => Number(row.policy_count) < 1);

    expect(withoutRls).toEqual([]);
    expect(withoutPolicy).toEqual([]);
  });
});
