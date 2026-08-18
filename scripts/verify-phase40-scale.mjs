import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL_TEST or DATABASE_URL is required");

const requiredTables = [
  "GrowthExperimentPlan",
  "LocalizationProject",
  "DistributionSyndication",
  "AttributionTouchpoint",
  "FinancialForecast",
  "BrandAssetRegistry",
  "PartnerConnection",
  "GovernedDataExport",
  "ReliabilityIncident",
  "ScaleCertificationGate",
];

const client = new Client({ connectionString });
await client.connect();

try {
  const tables = await client.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
    [requiredTables],
  );
  const present = new Set(tables.rows.map((row) => row.table_name));
  const missing = requiredTables.filter((name) => !present.has(name));
  if (missing.length) throw new Error(`Missing Phase 31-40 tables: ${missing.join(", ")}`);

  const tenantColumns = await client.query(
    `SELECT table_name, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'workspaceId'
        AND table_name = ANY($1::text[])`,
    [requiredTables],
  );
  const tenantByTable = new Map(tenantColumns.rows.map((row) => [row.table_name, row]));
  for (const table of requiredTables) {
    const column = tenantByTable.get(table);
    if (!column) throw new Error(`${table}.workspaceId is missing`);
    if (column.is_nullable !== "NO") throw new Error(`${table}.workspaceId must be NOT NULL`);
    if (column.column_default !== null) {
      throw new Error(`${table}.workspaceId must not have a global default`);
    }
  }

  const requiredIndexes = [
    "LocalizationProject_workspaceId_sourceEntityType_sourceEntityId_marketCode_languageCode_key",
    "DistributionSyndication_workspaceId_idempotencyKey_key",
    "PartnerConnection_workspaceId_partnerKey_key",
    "ScaleCertificationGate_workspaceId_gateKey_regionCode_key",
  ];
  const indexes = await client.query(
    `SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = ANY($1::text[])`,
    [requiredIndexes],
  );
  if (indexes.rowCount !== requiredIndexes.length) {
    throw new Error("One or more Phase 40 tenant uniqueness indexes are missing");
  }

  await client.query("BEGIN");
  const workspaceA = "30000000-0000-0000-0000-000000000001";
  const workspaceB = "40000000-0000-0000-0000-000000000001";
  const insert = `INSERT INTO "ScaleCertificationGate"
    ("id", "workspaceId", "gateKey", "regionCode", "status", "required", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, $1, 'load', 'DE', 'PENDING', true, now(), now())`;
  await client.query(insert, [workspaceA]);
  await client.query(insert, [workspaceB]);

  let duplicateRejected = false;
  try {
    await client.query(insert, [workspaceA]);
  } catch (error) {
    duplicateRejected =
      typeof error === "object" && error !== null && "code" in error && error.code === "23505";
  }
  if (!duplicateRejected) throw new Error("Scale gate tenant uniqueness was not enforced");

  await client.query("ROLLBACK");
  console.log("Phase 40 database structure and tenant scale gates verified.");
} finally {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Transaction may already be closed.
  }
  await client.end();
}
