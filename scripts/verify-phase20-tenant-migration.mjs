import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL_TEST or DATABASE_URL is required.");

const finalizedTables = [
  "ProductScore", "AffiliateProgram", "AffiliateLink", "LinkClick", "Campaign",
  "Script", "ScriptVersion", "VideoJob", "MediaAsset", "SocialAccount",
  "SocialPost", "PublishJob", "Revenue", "Expense", "TaxSetting", "Integration",
  "EncryptedCredential", "Agent", "AgentRun", "Automation", "AutomationRun",
  "Notification", "AuditLog", "ExperimentVariant", "ExperimentResult",
  "DataQualityIssue",
];

const client = new Client({ connectionString: databaseUrl });
await client.connect();

try {
  const defaults = await client.query(
    `SELECT table_name, column_default
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'workspaceId'
        AND table_name = ANY($1::text[])`,
    [finalizedTables],
  );
  if (defaults.rowCount !== finalizedTables.length) {
    throw new Error(
      `Expected ${finalizedTables.length} finalized workspace columns, found ${defaults.rowCount}.`,
    );
  }
  const remainingDefaults = defaults.rows.filter((row) => row.column_default !== null);
  if (remainingDefaults.length > 0) {
    throw new Error(
      `Legacy workspace defaults remain on: ${remainingDefaults.map((row) => row.table_name).join(", ")}`,
    );
  }

  const indexes = await client.query(
    `SELECT indexname
       FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = ANY($1::text[])`,
    [[
      "Agent_workspaceId_key_key",
      "Integration_workspaceId_providerKey_key",
    ]],
  );
  if (indexes.rowCount !== 2) {
    throw new Error("Tenant-scoped Agent and Integration unique indexes are missing.");
  }

  await client.query("BEGIN");
  const workspaceA = "phase20-test-workspace-a";
  const workspaceB = "phase20-test-workspace-b";
  const key = "phase20-shared-agent-key";

  await client.query(
    `INSERT INTO "Agent" ("id", "workspaceId", "key", "name", "role", "description", "createdAt", "updatedAt")
     VALUES
       (gen_random_uuid()::text, $1, $3, 'A', 'test', 'test', NOW(), NOW()),
       (gen_random_uuid()::text, $2, $3, 'B', 'test', 'test', NOW(), NOW())`,
    [workspaceA, workspaceB, key],
  );

  let duplicateRejected = false;
  await client.query("SAVEPOINT duplicate_check");
  try {
    await client.query(
      `INSERT INTO "Agent" ("id", "workspaceId", "key", "name", "role", "description", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, 'duplicate', 'test', 'test', NOW(), NOW())`,
      [workspaceA, key],
    );
  } catch (error) {
    duplicateRejected =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505";
    await client.query("ROLLBACK TO SAVEPOINT duplicate_check");
  }
  if (!duplicateRejected) {
    throw new Error("Same-workspace duplicate Agent.key was not rejected.");
  }

  let missingWorkspaceRejected = false;
  await client.query("SAVEPOINT workspace_check");
  try {
    await client.query(
      `INSERT INTO "Agent" ("id", "key", "name", "role", "description", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, 'phase20-missing-workspace', 'invalid', 'test', 'test', NOW(), NOW())`,
    );
  } catch (error) {
    missingWorkspaceRejected =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23502";
    await client.query("ROLLBACK TO SAVEPOINT workspace_check");
  }
  if (!missingWorkspaceRejected) {
    throw new Error("Agent insert without workspaceId was not rejected.");
  }

  await client.query("ROLLBACK");
  console.log("Phase 20 PostgreSQL migration verification passed.");
} finally {
  await client.end();
}
