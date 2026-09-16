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
const mediaA = "99999999-9999-4999-8999-999999999999";
const mediaB = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const accountA = "bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb";
const accountB = "cccccccc-1111-4111-8111-cccccccccccc";
const postA = "dddddddd-1111-4111-8111-dddddddddddd";
const postB = "eeeeeeee-1111-4111-8111-eeeeeeeeeeee";

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
    await admin.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Product", "AffiliateLink", "Campaign", "Script", "VideoJob", "MediaAsset", "SocialAccount", "SocialPost" TO "${roleName}"`,
    );

    await admin.query(
      `INSERT INTO "Product" (id, "workspaceId", "canonicalName", name, "createdAt", "updatedAt")
       VALUES ($1, $2, 'A', 'A', now(), now()), ($3, $4, 'B', 'B', now(), now())`,
      [productA, workspaceA, productB, workspaceB],
    );
    await admin.query(
      `INSERT INTO "Campaign" (id, "workspaceId", name, "productId", "createdAt", "updatedAt")
       VALUES ($1, $2, 'Campaign A', $3, now(), now()), ($4, $5, 'Campaign B', $6, now(), now())`,
      [campaignA, workspaceA, productA, campaignB, workspaceB, productB],
    );
    await admin.query(
      `INSERT INTO "Script" (id, "workspaceId", title, "productId", "campaignId", "createdAt", "updatedAt")
       VALUES ($1, $2, 'Script A', $3, $4, now(), now()), ($5, $6, 'Script B', $7, $8, now(), now())`,
      [scriptA, workspaceA, productA, campaignA, scriptB, workspaceB, productB, campaignB],
    );
    await admin.query(
      `INSERT INTO "VideoJob" (id, "workspaceId", "scriptId", "productId", "campaignId", provider, format, "aspectRatio", "durationSec", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, 'MOCK', 'short', '9:16', 15, now(), now()),
              ($6, $7, $8, $9, $10, 'MOCK', 'short', '9:16', 15, now(), now())`,
      [videoA, workspaceA, scriptA, productA, campaignA, videoB, workspaceB, scriptB, productB, campaignB],
    );
    await admin.query(
      `INSERT INTO "MediaAsset" (id, "workspaceId", kind, "fileName", "storageKey", url, "mimeType", "sizeBytes", "productId", "campaignId", "videoJobId", "createdAt")
       VALUES ($1, $2, 'VIDEO', 'a.mp4', 'a.mp4', 'https://example.test/a.mp4', 'video/mp4', 1, $3, $4, $5, now()),
              ($6, $7, 'VIDEO', 'b.mp4', 'b.mp4', 'https://example.test/b.mp4', 'video/mp4', 1, $8, $9, $10, now())`,
      [mediaA, workspaceA, productA, campaignA, videoA, mediaB, workspaceB, productB, campaignB, videoB],
    );
    await admin.query(
      `INSERT INTO "SocialAccount" (id, "workspaceId", platform, handle, "createdAt", "updatedAt")
       VALUES ($1, $2, 'INSTAGRAM', '@workspace_a', now(), now()), ($3, $4, 'INSTAGRAM', '@workspace_b', now(), now())`,
      [accountA, workspaceA, accountB, workspaceB],
    );
    await admin.query(
      `INSERT INTO "SocialPost" (id, "workspaceId", "campaignId", "mediaAssetId", "accountId", caption, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, 'Post A', now(), now()), ($6, $7, $8, $9, $10, 'Post B', now(), now())`,
      [postA, workspaceA, campaignA, mediaA, accountA, postB, workspaceB, campaignB, mediaB, accountB],
    );

    restricted = new Client({ connectionString: restrictedUrl() });
    await restricted.connect();
  });

  afterAll(async () => {
    if (restricted) await restricted.end();
    if (admin) {
      await admin.query(`DELETE FROM "SocialPost" WHERE id = ANY($1::text[])`, [[postA, postB]]);
      await admin.query(`DELETE FROM "SocialAccount" WHERE id = ANY($1::text[])`, [[accountA, accountB]]);
      await admin.query(`DELETE FROM "MediaAsset" WHERE id = ANY($1::text[])`, [[mediaA, mediaB]]);
      await admin.query(`DELETE FROM "VideoJob" WHERE id = ANY($1::text[])`, [[videoA, videoB]]);
      await admin.query(`DELETE FROM "Script" WHERE id = ANY($1::text[])`, [[scriptA, scriptB]]);
      await admin.query(`DELETE FROM "Campaign" WHERE id = ANY($1::text[])`, [[campaignA, campaignB]]);
      await admin.query(`DELETE FROM "Product" WHERE id = ANY($1::text[])`, [[productA, productB]]);
      await admin.query(`DROP ROLE IF EXISTS "${roleName}"`);
      await admin.end();
    }
  });

  it("shows only workspace A rows to an NOBYPASSRLS role across every protected legacy root", async () => {
    await beginWorkspace(workspaceA);
    const campaigns = await restricted.query<{ id: string }>(`SELECT id FROM "Campaign" ORDER BY id`);
    const scripts = await restricted.query<{ id: string }>(`SELECT id FROM "Script" ORDER BY id`);
    const videos = await restricted.query<{ id: string }>(`SELECT id FROM "VideoJob" ORDER BY id`);
    const media = await restricted.query<{ id: string }>(`SELECT id FROM "MediaAsset" ORDER BY id`);
    const accounts = await restricted.query<{ id: string }>(`SELECT id FROM "SocialAccount" ORDER BY id`);
    const posts = await restricted.query<{ id: string }>(`SELECT id FROM "SocialPost" ORDER BY id`);

    expect(campaigns.rows.map((row) => row.id)).toEqual([campaignA]);
    expect(scripts.rows.map((row) => row.id)).toEqual([scriptA]);
    expect(videos.rows.map((row) => row.id)).toEqual([videoA]);
    expect(media.rows.map((row) => row.id)).toEqual([mediaA]);
    expect(accounts.rows.map((row) => row.id)).toEqual([accountA]);
    expect(posts.rows.map((row) => row.id)).toEqual([postA]);
    await rollback();
  });

  it("shows only workspace B rows after changing the transaction-local context", async () => {
    await beginWorkspace(workspaceB);
    const campaigns = await restricted.query<{ id: string }>(`SELECT id FROM "Campaign" ORDER BY id`);
    const media = await restricted.query<{ id: string }>(`SELECT id FROM "MediaAsset" ORDER BY id`);
    const accounts = await restricted.query<{ id: string }>(`SELECT id FROM "SocialAccount" ORDER BY id`);
    const posts = await restricted.query<{ id: string }>(`SELECT id FROM "SocialPost" ORDER BY id`);
    expect(campaigns.rows.map((row) => row.id)).toEqual([campaignB]);
    expect(media.rows.map((row) => row.id)).toEqual([mediaB]);
    expect(accounts.rows.map((row) => row.id)).toEqual([accountB]);
    expect(posts.rows.map((row) => row.id)).toEqual([postB]);
    await rollback();
  });

  it("returns no protected rows when workspace context is absent", async () => {
    await beginWorkspace();
    for (const table of ["Campaign", "Script", "VideoJob", "MediaAsset", "SocialAccount", "SocialPost"]) {
      const result = await restricted.query<{ count: string }>(`SELECT count(*)::text AS count FROM "${table}"`);
      expect(result.rows[0]?.count).toBe("0");
    }
    await rollback();
  });

  it("rejects a direct cross-workspace key", async () => {
    await beginWorkspace(workspaceA);
    await expect(
      restricted.query(
        `INSERT INTO "Campaign" (id, "workspaceId", name, "productId", "createdAt", "updatedAt") VALUES ($1, $2, 'Cross tenant', $3, now(), now())`,
        [randomUUID(), workspaceB, productB],
      ),
    ).rejects.toThrow();
    await rollback();
  });

  it("rejects a same-workspace row that references a foreign parent", async () => {
    await beginWorkspace(workspaceA);
    await expect(
      restricted.query(
        `INSERT INTO "SocialPost" (id, "workspaceId", "campaignId", "mediaAssetId", "accountId", caption, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, 'Cross-parent', now(), now())`,
        [randomUUID(), workspaceA, campaignB, mediaA, accountA],
      ),
    ).rejects.toThrow();
    await rollback();
  });

  it("inherits app.workspace_id for new rows inside the tenant transaction", async () => {
    await beginWorkspace(workspaceA);
    const id = randomUUID();
    await restricted.query(
      `INSERT INTO "SocialAccount" (id, platform, handle, "createdAt", "updatedAt") VALUES ($1, 'INSTAGRAM', '@auto_scope', now(), now())`,
      [id],
    );
    const result = await restricted.query<{ workspaceId: string }>(
      `SELECT "workspaceId" FROM "SocialAccount" WHERE id = $1`,
      [id],
    );
    expect(result.rows[0]?.workspaceId).toBe(workspaceA);
    await rollback();
  });
});
