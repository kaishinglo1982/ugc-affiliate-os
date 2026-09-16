import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
const runDatabaseTest = Boolean(process.env.CI && databaseUrl);

const workspaceA = "12121212-1212-4121-8121-121212121212";
const workspaceB = "34343434-3434-4343-8343-343434343434";

const ids = {
  productA: randomUUID(),
  productB: randomUUID(),
  credentialA: randomUUID(),
  credentialB: randomUUID(),
  programA: randomUUID(),
  programB: randomUUID(),
  linkA: randomUUID(),
  linkB: randomUUID(),
  clickA: randomUUID(),
  clickB: randomUUID(),
  revenueA: randomUUID(),
  revenueB: randomUUID(),
  expenseA: randomUUID(),
  expenseB: randomUUID(),
  taxA: randomUUID(),
  taxB: randomUUID(),
  integrationA: randomUUID(),
  integrationB: randomUUID(),
  agentA: randomUUID(),
  agentB: randomUUID(),
  runA: randomUUID(),
  runB: randomUUID(),
  auditA: randomUUID(),
  auditB: randomUUID(),
  notificationA: randomUUID(),
  notificationB: randomUUID(),
};

const slugA = `rls-a-${randomUUID()}`;
const slugB = `rls-b-${randomUUID()}`;
const roleName = `ugc_fin_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
const rolePassword = `test_${randomUUID()}`;
let admin: Client;
let restricted: Client;

function restrictedUrl(): string {
  if (!databaseUrl) throw new Error("DATABASE_URL_TEST_REQUIRED");
  const url = new URL(databaseUrl);
  url.username = roleName;
  url.password = rolePassword;
  return url.toString();
}

async function beginWorkspace(workspaceId?: string): Promise<void> {
  await restricted.query("BEGIN");
  if (workspaceId) {
    await restricted.query("SELECT set_config('app.workspace_id', $1, true)", [workspaceId]);
  }
}

async function rollback(): Promise<void> {
  await restricted.query("ROLLBACK");
}

const protectedTables = [
  "AffiliateProgram",
  "AffiliateLink",
  "LinkClick",
  "Revenue",
  "Expense",
  "TaxSetting",
  "Integration",
  "EncryptedCredential",
  "Agent",
  "AgentRun",
  "AuditLog",
  "Notification",
] as const;

describe.runIf(runDatabaseTest)("finance, secret vault and control-plane PostgreSQL RLS", () => {
  beforeAll(async () => {
    admin = new Client({ connectionString: databaseUrl });
    await admin.connect();

    await admin.query(
      `CREATE ROLE "${roleName}" LOGIN PASSWORD '${rolePassword}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`,
    );
    await admin.query(`GRANT USAGE ON SCHEMA public TO "${roleName}"`);
    await admin.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
       "Product", "AffiliateProgram", "AffiliateLink", "LinkClick", "Revenue", "Expense",
       "TaxSetting", "Integration", "EncryptedCredential", "Agent", "AgentRun", "AuditLog", "Notification"
       TO "${roleName}"`,
    );

    await admin.query(
      `INSERT INTO "Product" (id, "workspaceId", "canonicalName", name, "createdAt", "updatedAt")
       VALUES ($1, $2, 'Finance A', 'Finance A', now(), now()),
              ($3, $4, 'Finance B', 'Finance B', now(), now())`,
      [ids.productA, workspaceA, ids.productB, workspaceB],
    );

    await admin.query(
      `INSERT INTO "EncryptedCredential" (id, "workspaceId", label, "cipherText", iv, "authTag", "lastRotatedAt", "createdAt")
       VALUES ($1, $2, 'Credential A', 'cipher-a', 'iv-a', 'tag-a', now(), now()),
              ($3, $4, 'Credential B', 'cipher-b', 'iv-b', 'tag-b', now(), now())`,
      [ids.credentialA, workspaceA, ids.credentialB, workspaceB],
    );

    await admin.query(
      `INSERT INTO "AffiliateProgram" (id, "workspaceId", provider, "credentialId", status, "createdAt", "updatedAt")
       VALUES ($1, $2, 'CUSTOM', $3, 'CONNECTED', now(), now()),
              ($4, $5, 'CUSTOM', $6, 'CONNECTED', now(), now())`,
      [ids.programA, workspaceA, ids.credentialA, ids.programB, workspaceB, ids.credentialB],
    );

    await admin.query(
      `INSERT INTO "AffiliateLink" (id, "workspaceId", "programId", "productId", label, "destinationUrl", "shortSlug", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'Link A', 'https://example.test/a', $5, now(), now()),
              ($6, $7, $8, $9, 'Link B', 'https://example.test/b', $10, now(), now())`,
      [ids.linkA, workspaceA, ids.programA, ids.productA, slugA, ids.linkB, workspaceB, ids.programB, ids.productB, slugB],
    );

    await admin.query(
      `INSERT INTO "LinkClick" (id, "workspaceId", "linkId", "occurredAt")
       VALUES ($1, $2, $3, now()), ($4, $5, $6, now())`,
      [ids.clickA, workspaceA, ids.linkA, ids.clickB, workspaceB, ids.linkB],
    );

    await admin.query(
      `INSERT INTO "Revenue" (id, "workspaceId", date, "programId", "productId", "grossAmount", "createdAt", "updatedAt")
       VALUES ($1, $2, now(), $3, $4, 10, now(), now()),
              ($5, $6, now(), $7, $8, 20, now(), now())`,
      [ids.revenueA, workspaceA, ids.programA, ids.productA, ids.revenueB, workspaceB, ids.programB, ids.productB],
    );

    await admin.query(
      `INSERT INTO "Expense" (id, "workspaceId", date, category, "productId", amount, "createdAt", "updatedAt")
       VALUES ($1, $2, now(), 'ADVERTISING', $3, 3, now(), now()),
              ($4, $5, now(), 'ADVERTISING', $6, 4, now(), now())`,
      [ids.expenseA, workspaceA, ids.productA, ids.expenseB, workspaceB, ids.productB],
    );

    await admin.query(
      `INSERT INTO "TaxSetting" (id, "workspaceId", "updatedAt")
       VALUES ($1, $2, now()), ($3, $4, now())`,
      [ids.taxA, workspaceA, ids.taxB, workspaceB],
    );

    await admin.query(
      `INSERT INTO "Integration" (id, "workspaceId", "providerKey", "displayName", category, "credentialId", "createdAt", "updatedAt")
       VALUES ($1, $2, 'shared-provider', 'Shared A', 'AI', $3, now(), now()),
              ($4, $5, 'shared-provider', 'Shared B', 'AI', $6, now(), now())`,
      [ids.integrationA, workspaceA, ids.credentialA, ids.integrationB, workspaceB, ids.credentialB],
    );

    await admin.query(
      `INSERT INTO "Agent" (id, "workspaceId", key, name, role, description, "createdAt", "updatedAt")
       VALUES ($1, $2, 'shared-agent', 'Agent A', 'test', 'A', now(), now()),
              ($3, $4, 'shared-agent', 'Agent B', 'test', 'B', now(), now())`,
      [ids.agentA, workspaceA, ids.agentB, workspaceB],
    );

    await admin.query(
      `INSERT INTO "AgentRun" (id, "workspaceId", "agentId", status, "startedAt")
       VALUES ($1, $2, $3, 'RUNNING', now()), ($4, $5, $6, 'RUNNING', now())`,
      [ids.runA, workspaceA, ids.agentA, ids.runB, workspaceB, ids.agentB],
    );

    await admin.query(
      `INSERT INTO "AuditLog" (id, "workspaceId", action, "entityType", "createdAt")
       VALUES ($1, $2, 'test.a', 'Test', now()), ($3, $4, 'test.b', 'Test', now())`,
      [ids.auditA, workspaceA, ids.auditB, workspaceB],
    );

    await admin.query(
      `INSERT INTO "Notification" (id, "workspaceId", level, title, message, "createdAt")
       VALUES ($1, $2, 'INFO', 'Notification A', 'A', now()),
              ($3, $4, 'INFO', 'Notification B', 'B', now())`,
      [ids.notificationA, workspaceA, ids.notificationB, workspaceB],
    );

    restricted = new Client({ connectionString: restrictedUrl() });
    await restricted.connect();
  });

  afterAll(async () => {
    if (restricted) await restricted.end();
    if (!admin) return;

    await admin.query(`DELETE FROM "Notification" WHERE id = ANY($1::text[])`, [[ids.notificationA, ids.notificationB]]);
    await admin.query(`DELETE FROM "AgentRun" WHERE id = ANY($1::text[])`, [[ids.runA, ids.runB]]);
    await admin.query(`DELETE FROM "Agent" WHERE id = ANY($1::text[])`, [[ids.agentA, ids.agentB]]);
    await admin.query(`DELETE FROM "AuditLog" WHERE id = ANY($1::text[])`, [[ids.auditA, ids.auditB]]);
    await admin.query(`DELETE FROM "Integration" WHERE id = ANY($1::text[])`, [[ids.integrationA, ids.integrationB]]);
    await admin.query(`DELETE FROM "TaxSetting" WHERE id = ANY($1::text[])`, [[ids.taxA, ids.taxB]]);
    await admin.query(`DELETE FROM "Revenue" WHERE id = ANY($1::text[])`, [[ids.revenueA, ids.revenueB]]);
    await admin.query(`DELETE FROM "Expense" WHERE id = ANY($1::text[])`, [[ids.expenseA, ids.expenseB]]);
    await admin.query(`DELETE FROM "LinkClick" WHERE id = ANY($1::text[])`, [[ids.clickA, ids.clickB]]);
    await admin.query(`DELETE FROM "AffiliateLink" WHERE id = ANY($1::text[])`, [[ids.linkA, ids.linkB]]);
    await admin.query(`DELETE FROM "AffiliateProgram" WHERE id = ANY($1::text[])`, [[ids.programA, ids.programB]]);
    await admin.query(`DELETE FROM "EncryptedCredential" WHERE id = ANY($1::text[])`, [[ids.credentialA, ids.credentialB]]);
    await admin.query(`DELETE FROM "Product" WHERE id = ANY($1::text[])`, [[ids.productA, ids.productB]]);
    await admin.query(`DROP OWNED BY "${roleName}"`);
    await admin.query(`DROP ROLE IF EXISTS "${roleName}"`);
    await admin.end();
  });

  it("shows only workspace A rows across finance, secret and control-plane roots", async () => {
    await beginWorkspace(workspaceA);

    for (const table of protectedTables) {
      const result = await restricted.query<{ workspaceId: string }>(
        `SELECT "workspaceId" FROM "${table}" ORDER BY id`,
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]?.workspaceId).toBe(workspaceA);
    }

    const integration = await restricted.query<{ providerKey: string }>(
      `SELECT "providerKey" FROM "Integration" WHERE "providerKey" = 'shared-provider'`,
    );
    const agent = await restricted.query<{ key: string }>(
      `SELECT key FROM "Agent" WHERE key = 'shared-agent'`,
    );
    expect(integration.rows).toEqual([{ providerKey: "shared-provider" }]);
    expect(agent.rows).toEqual([{ key: "shared-agent" }]);
    await rollback();
  });

  it("shows only workspace B rows with the same tenant-local keys", async () => {
    await beginWorkspace(workspaceB);
    const integrations = await restricted.query<{ id: string }>(
      `SELECT id FROM "Integration" WHERE "providerKey" = 'shared-provider'`,
    );
    const agents = await restricted.query<{ id: string }>(
      `SELECT id FROM "Agent" WHERE key = 'shared-agent'`,
    );
    const credentials = await restricted.query<{ id: string }>(`SELECT id FROM "EncryptedCredential"`);
    const notifications = await restricted.query<{ id: string }>(`SELECT id FROM "Notification"`);

    expect(integrations.rows.map((row) => row.id)).toEqual([ids.integrationB]);
    expect(agents.rows.map((row) => row.id)).toEqual([ids.agentB]);
    expect(credentials.rows.map((row) => row.id)).toEqual([ids.credentialB]);
    expect(notifications.rows.map((row) => row.id)).toEqual([ids.notificationB]);
    await rollback();
  });

  it("returns no protected finance/control rows without workspace context", async () => {
    await beginWorkspace();
    for (const table of protectedTables) {
      const result = await restricted.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM "${table}"`,
      );
      expect(result.rows[0]?.count).toBe("0");
    }
    await rollback();
  });

  it("rejects Revenue that points at a Product from another workspace", async () => {
    await beginWorkspace(workspaceA);
    await expect(
      restricted.query(
        `INSERT INTO "Revenue" (id, "workspaceId", date, "productId", "grossAmount", "createdAt", "updatedAt")
         VALUES ($1, $2, now(), $3, 1, now(), now())`,
        [randomUUID(), workspaceA, ids.productB],
      ),
    ).rejects.toThrow();
    await rollback();
  });

  it("rejects an AffiliateProgram bound to a foreign credential", async () => {
    await beginWorkspace(workspaceA);
    await expect(
      restricted.query(
        `INSERT INTO "AffiliateProgram" (id, "workspaceId", provider, "credentialId", "createdAt", "updatedAt")
         VALUES ($1, $2, 'CUSTOM', $3, now(), now())`,
        [randomUUID(), workspaceA, ids.credentialB],
      ),
    ).rejects.toThrow();
    await rollback();
  });

  it("rejects an AgentRun bound to a foreign Agent", async () => {
    await beginWorkspace(workspaceA);
    await expect(
      restricted.query(
        `INSERT INTO "AgentRun" (id, "workspaceId", "agentId", status, "startedAt")
         VALUES ($1, $2, $3, 'RUNNING', now())`,
        [randomUUID(), workspaceA, ids.agentB],
      ),
    ).rejects.toThrow();
    await rollback();
  });

  it("inherits app.workspace_id for tenant-owned audit and notification rows", async () => {
    await beginWorkspace(workspaceA);
    const auditId = randomUUID();
    const notificationId = randomUUID();
    await restricted.query(
      `INSERT INTO "AuditLog" (id, action, "entityType", "createdAt") VALUES ($1, 'auto.scope', 'Test', now())`,
      [auditId],
    );
    await restricted.query(
      `INSERT INTO "Notification" (id, level, title, message, "createdAt") VALUES ($1, 'INFO', 'Auto scope', 'Scoped', now())`,
      [notificationId],
    );

    const audit = await restricted.query<{ workspaceId: string }>(
      `SELECT "workspaceId" FROM "AuditLog" WHERE id = $1`,
      [auditId],
    );
    const notification = await restricted.query<{ workspaceId: string }>(
      `SELECT "workspaceId" FROM "Notification" WHERE id = $1`,
      [notificationId],
    );
    expect(audit.rows[0]?.workspaceId).toBe(workspaceA);
    expect(notification.rows[0]?.workspaceId).toBe(workspaceA);
    await rollback();
  });
});
