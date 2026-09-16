import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
const runDatabaseTest = Boolean(process.env.CI && databaseUrl);

const workspaceA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const workspaceB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const productA = "11111111-1111-4111-8111-111111111111";
const productB = "22222222-2222-4222-8222-222222222222";
const campaignA = "33333333-3333-4333-8333-333333333333";
const campaignB = "44444444-4444-4444-8444-444444444444";
const scriptA = "55555555-5555-4555-8555-555555555555";
const scriptB = "66666666-6666-4666-8666-666666666666";
const videoA = "77777777-7777-4777-8777-777777777777";
const videoB = "88888888-8888-4888-8888-888888888888";

const roleName = `ugc_rls_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
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

describe.runIf(runDatabaseTest)("legacy workspace PostgreSQL RLS", () => {
  beforeAll(async () => {
    admin = new Client({ connectionString: databaseUrl });
    await admin.connect();

    await admin.query(`CREATE ROLE "${roleName}" LOGIN PASSWORD '${rolePassword}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`);
    await admin.query(`GRANT USAGE ON SCHEMA public TO "${roleName}"`);
    await admin.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Product", "AffiliateLink", "Campaign", "Script", "VideoJob" TO "${roleName}"`);

    await admin.query(
      `INSERT INTO "Product" (id, "workspaceId", "canonicalName", name, "createdAt", "updatedAt")
       VALUES ($1, $2, 'A', 'A', now(), now()), ($3, $4, 'B', 'B', now(), now())`,
      [productA, workspaceA, productB, workspaceB],
    );
    await admin.query(
      `INSERT INTO "Campaign" (id, name, "productId", "createdAt", "updatedAt")
       VALUES ($1, 'Campaign A', $2, now(), now()), ($3, 'Campaign B', $4, now(), now())`,
      [campaignA, productA, campaignB, productB],
    );
    await admin.query(
      `INSERT INTO "Script" (id, title, "productId", "campaignId", "createdAt", "updatedAt")
       VALUES ($1, 'Script A', $2, $3, now(), now()), ($4, 'Script B', $5, $6, now(), now())`,
      [scriptA, productA, campaignA, scriptB, productB, campaignB],
    );
    await admin.query(
      `INSERT INTO "VideoJob" (id, "scriptId", "productId", "campaignId", provider, format, "aspectRatio", "durationSec", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'MOCK', 'short', '9:16', 15, now(), now()),
              ($5, $6, $7, $8, 'MOCK', 'short', '9:16', 15, now(), now())`,
      [videoA, scriptA, productA, campaignA, videoB, scriptB, productB, campaignB],
    );

    restricted = new Client({ connectionString: restrictedUrl() });
    await restricted.connect();
  });

  afterAll(async () => {
    if (restricted) await restricted.end();
    if (admin) {
      await admin.query(`DELETE FROM "VideoJob" WHERE id = ANY($1::text[])`, [[videoA, videoB]]);
      await admin.query(`DELETE FROM "Script" WHERE id = ANY($1::text[])`, [[scriptA, scriptB]]);
      await admin.query(`DELETE FROM "Campaign" WHERE id = ANY($1::text[])`, [[campaignA, campaignB]]);
      await admin.query(`DELETE FROM "Product" WHERE id = ANY($1::text[])`, [[productA, productB]]);
      await admin.query(`DROP ROLE IF EXISTS "${roleName}"`);
      await admin.end();
    }
  });

  it("shows only workspace A rows to an NOBYPASSRLS role", async () => {
    await beginWorkspace(workspaceA);
    const campaigns = await restricted.query<{ id: string }>(`SELECT id FROM "Campaign" ORDER BY id`);
    const scripts = await restricted.query<{ id: string }>(`SELECT id FROM "Script" ORDER BY id`);
    const videos = await restricted.query<{ id: string }>(`SELECT id FROM "VideoJob" ORDER BY id`);
    expect(campaigns.rows.map((row) => row.id)).toEqual([campaignA]);
    expect(scripts.rows.map((row) => row.id)).toEqual([scriptA]);
    expect(videos.rows.map((row) => row.id)).toEqual([videoA]);
    await rollback();
  });

  it("shows only workspace B rows after changing the transaction-local context", async () => {
    await beginWorkspace(workspaceB);
    const campaigns = await restricted.query<{ id: string }>(`SELECT id FROM "Campaign" ORDER BY id`);
    expect(campaigns.rows.map((row) => row.id)).toEqual([campaignB]);
    await rollback();
  });

  it("returns no protected rows when workspace context is absent", async () => {
    await beginWorkspace();
    const result = await restricted.query<{ count: string }>(`SELECT count(*)::text AS count FROM "Campaign"`);
    expect(result.rows[0]?.count).toBe("0");
    await rollback();
  });

  it("rejects a cross-workspace insert", async () => {
    await beginWorkspace(workspaceA);
    await expect(
      restricted.query(
        `INSERT INTO "Campaign" (id, name, "productId", "createdAt", "updatedAt") VALUES ($1, 'Cross tenant', $2, now(), now())`,
        [randomUUID(), productB],
      ),
    ).rejects.toThrow();
    await rollback();
  });
});
