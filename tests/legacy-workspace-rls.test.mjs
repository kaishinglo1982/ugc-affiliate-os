import assert from "node:assert/strict";
import pg from "pg";

const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
const TEST_ROLE = "ugc_rls_test";
const TEST_PASSWORD = "ugc-rls-test-password";
const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "22222222-2222-4222-8222-222222222222";

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required for tenant RLS tests");
}

async function adminQuery(text, values = []) {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    return await client.query(text, values);
  } finally {
    await client.end();
  }
}

async function roleClient() {
  const client = new Client({
    connectionString: DATABASE_URL.replace(/\/\/[^@]+@/, `//${TEST_ROLE}:${TEST_PASSWORD}@`),
  });
  await client.connect();
  return client;
}

async function withWorkspace(client, workspaceId, fn) {
  await client.query("BEGIN");
  try {
    await client.query("SELECT set_config('app.current_workspace_id', $1, true)", [workspaceId]);
    const result = await fn();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

const tables = ["ProductScore","AffiliateProgram","AffiliateLink","LinkClick","Campaign","Script","ScriptVersion","VideoJob","MediaAsset","SocialAccount","SocialPost","PublishJob","Revenue","Expense","TaxSetting","Integration","EncryptedCredential","Agent","AgentRun","Automation","AutomationRun","Notification","ContactRequest","AuditLog"];

const admin = await new Client({ connectionString: DATABASE_URL });
await admin.connect();
try {
  await admin.query(`DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${TEST_ROLE}') THEN
      CREATE ROLE ${TEST_ROLE} LOGIN PASSWORD '${TEST_PASSWORD}';
    ELSE
      ALTER ROLE ${TEST_ROLE} PASSWORD '${TEST_PASSWORD}';
    END IF;
  END $$;`);
  await admin.query(`GRANT USAGE ON SCHEMA public TO ${TEST_ROLE}`);
  for (const table of tables) {
    await admin.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "${table}" TO ${TEST_ROLE}`);
  }

  for (const table of ["Campaign", "Revenue"]) {
    const state = await admin.query(
      "SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid = $1::regclass",
      [table],
    );
    assert.equal(state.rows[0].relrowsecurity, true, `${table} RLS must be enabled`);
    assert.equal(state.rows[0].relforcerowsecurity, true, `${table} RLS must be forced`);
  }
} finally {
  await admin.end();
}

const client = await roleClient();
try {
  const campaignA = await withWorkspace(client, TENANT_A, async () => {
    const result = await client.query(
      'INSERT INTO "Campaign" ("id","workspaceId","name","status","currency","updatedAt") VALUES (gen_random_uuid(),$1,$2,\'DRAFT\',\'EUR\',now()) RETURNING id',
      [TENANT_A, "tenant-a-campaign"],
    );
    return result.rows[0].id;
  });

  const revenueA = await withWorkspace(client, TENANT_A, async () => {
    const result = await client.query(
      'INSERT INTO "Revenue" ("id","workspaceId","date","grossAmount","currency","status","updatedAt") VALUES (gen_random_uuid(),$1,now(),10,\'EUR\',\'PENDING\',now()) RETURNING id',
      [TENANT_A],
    );
    return result.rows[0].id;
  });

  const visibleToB = await withWorkspace(client, TENANT_B, async () => {
    const campaign = await client.query('SELECT id FROM "Campaign" WHERE id = $1', [campaignA]);
    const revenue = await client.query('SELECT id FROM "Revenue" WHERE id = $1', [revenueA]);
    return { campaign: campaign.rowCount, revenue: revenue.rowCount };
  });
  assert.equal(visibleToB.campaign, 0, "tenant B must not read tenant A campaign");
  assert.equal(visibleToB.revenue, 0, "tenant B must not read tenant A revenue");

  await withWorkspace(client, TENANT_B, async () => {
    const update = await client.query('UPDATE "Campaign" SET name = \'cross-tenant\' WHERE id = $1', [campaignA]);
    const remove = await client.query('DELETE FROM "Revenue" WHERE id = $1', [revenueA]);
    assert.equal(update.rowCount, 0, "tenant B must not update tenant A campaign");
    assert.equal(remove.rowCount, 0, "tenant B must not delete tenant A revenue");
    await assert.rejects(
      client.query(
        'INSERT INTO "Campaign" ("id","workspaceId","name","status","currency","updatedAt") VALUES (gen_random_uuid(),$1,$2,\'DRAFT\',\'EUR\',now())',
        [TENANT_A, "forbidden-cross-tenant-insert"],
      ),
    );
  });
} finally {
  await client.end();
}

console.log("Legacy workspace RLS isolation: PASS");
