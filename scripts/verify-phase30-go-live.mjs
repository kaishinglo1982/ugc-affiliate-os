import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL_TEST or DATABASE_URL is required");
}

const requiredTables = [
  "ProviderRoutingPolicy",
  "ProviderUsageRecord",
  "ProviderHealthCheck",
  "AudienceContact",
  "CreatorProfile",
  "CreatorEngagement",
  "CreatorDeliverable",
  "ComplianceEvidence",
  "ExecutiveObjective",
  "OperationalKillSwitch",
  "GoLiveGate",
];

const client = new Client({ connectionString });
await client.connect();

try {
  const tables = await client.query(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])`,
    [requiredTables],
  );
  const present = new Set(tables.rows.map((row) => row.table_name));
  const missing = requiredTables.filter((table) => !present.has(table));
  if (missing.length > 0) {
    throw new Error(`Missing Phase 21-30 tables: ${missing.join(", ")}`);
  }

  const tenantColumns = await client.query(
    `SELECT table_name, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'workspaceId'
        AND table_name = ANY($1::text[])`,
    [requiredTables],
  );
  const columns = new Map(
    tenantColumns.rows.map((row) => [row.table_name, row]),
  );
  for (const table of requiredTables) {
    const column = columns.get(table);
    if (!column) throw new Error(`${table}.workspaceId is missing`);
    if (column.is_nullable !== "NO") {
      throw new Error(`${table}.workspaceId must be NOT NULL`);
    }
    if (column.column_default !== null) {
      throw new Error(`${table}.workspaceId must not have a global default`);
    }
  }

  const indexes = await client.query(
    `SELECT indexname
       FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = ANY($1::text[])`,
    [[
      "AudienceContact_workspaceId_pseudonymousKey_key",
      "GoLiveGate_workspaceId_gateKey_key",
      "ProviderRoutingPolicy_workspaceId_capability_name_key",
    ]],
  );
  if (indexes.rowCount !== 3) {
    throw new Error("One or more tenant compound uniqueness gates are missing");
  }

  await client.query("BEGIN");
  const workspaceA = "10000000-0000-0000-0000-000000000001";
  const workspaceB = "20000000-0000-0000-0000-000000000001";
  await client.query(
    `INSERT INTO "GoLiveGate"
      ("id", "workspaceId", "gateKey", "status", "required", "createdAt", "updatedAt")
     VALUES
      (gen_random_uuid()::text, $1, 'security', 'PENDING', true, now(), now()),
      (gen_random_uuid()::text, $2, 'security', 'PENDING', true, now(), now())`,
    [workspaceA, workspaceB],
  );

  let duplicateRejected = false;
  try {
    await client.query(
      `INSERT INTO "GoLiveGate"
        ("id", "workspaceId", "gateKey", "status", "required", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, 'security', 'PENDING', true, now(), now())`,
      [workspaceA],
    );
  } catch (error) {
    duplicateRejected =
      typeof error === "object" && error !== null && "code" in error && error.code === "23505";
  }
  if (!duplicateRejected) {
    throw new Error("GoLiveGate tenant uniqueness was not enforced");
  }

  await client.query("ROLLBACK");
  console.log("Phase 30 database structure and tenant gates verified.");
} finally {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Transaction may already be closed.
  }
  await client.end();
}
