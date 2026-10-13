import assert from "node:assert/strict";
import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for runtime RLS isolation verification");

const workspaceA = "20000000-0000-4000-8000-000000000001";
const workspaceB = "20000000-0000-4000-8000-000000000002";
const productA = "20000000-0000-4000-8000-000000000101";
const productB = "20000000-0000-4000-8000-000000000102";
const roleName = "ugc_rls_runtime_test";
const client = new Client({ connectionString: databaseUrl });

await client.connect();
try {
  // CI uses a disposable PostgreSQL database. The non-owner role is essential:
  // the migration runner/superuser bypasses RLS even when FORCE ROW LEVEL SECURITY is set.
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${roleName}') THEN
        CREATE ROLE ${roleName} NOLOGIN NOSUPERUSER NOBYPASSRLS;
      END IF;
    END
    $$;
  `);
  await client.query(`GRANT USAGE ON SCHEMA public TO ${roleName}`);
  await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Product" TO ${roleName}`);

  await client.query('DELETE FROM "Product" WHERE id = ANY($1::text[])', [[productA, productB]]);
  await client.query(
    `INSERT INTO "Product" (id, "workspaceId", "canonicalName", name, "updatedAt")
     VALUES ($1, $2, $3, $3, NOW()), ($4, $5, $6, $6, NOW())`,
    [productA, workspaceA, "RLS runtime fixture A", productB, workspaceB, "RLS runtime fixture B"],
  );

  await client.query("BEGIN");
  try {
    await client.query(`SET LOCAL ROLE ${roleName}`);
    const unscoped = await client.query('SELECT id FROM "Product" WHERE id = ANY($1::text[])', [[productA, productB]]);
    assert.equal(unscoped.rowCount, 0, "missing workspace context must fail closed");

    await client.query("SELECT set_config('app.current_workspace_id', $1, true)", [workspaceA]);
    const visible = await client.query('SELECT id FROM "Product" WHERE id = ANY($1::text[]) ORDER BY id', [[productA, productB]]);
    assert.deepEqual(visible.rows.map((row) => row.id), [productA], "workspace A must see only its own fixture");

    const updateForeign = await client.query('UPDATE "Product" SET name = $1, "updatedAt" = NOW() WHERE id = $2', ["cross-tenant write", productB]);
    assert.equal(updateForeign.rowCount, 0, "workspace A must not update workspace B rows");

    const deleteForeign = await client.query('DELETE FROM "Product" WHERE id = $1', [productB]);
    assert.equal(deleteForeign.rowCount, 0, "workspace A must not delete workspace B rows");

    await assert.rejects(
      client.query(
        'INSERT INTO "Product" (id, "workspaceId", "canonicalName", name, "updatedAt") VALUES ($1, $2, $3, $3, NOW())',
        ["20000000-0000-4000-8000-000000000103", workspaceB, "RLS forbidden insert"],
      ),
      (error) => error?.code === "42501",
      "workspace A must not insert a row owned by workspace B",
    );
  } finally {
    await client.query("ROLLBACK");
  }

  console.log("Workspace RLS runtime isolation: PASS (missing context, cross-workspace read/update/delete/insert)");
} finally {
  await client.query('DELETE FROM "Product" WHERE id = ANY($1::text[])', [[productA, productB]]);
  await client.end();
}
