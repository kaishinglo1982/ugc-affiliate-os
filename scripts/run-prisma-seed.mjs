import { spawnSync } from "node:child_process";
import { Client } from "pg";
import "dotenv/config";

const databaseUrl = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === "production";
const allowDemoSeed = process.env.ALLOW_DEMO_SEED === "true";
const needsDemoCompatibility = !isProduction || allowDemoSeed;

const compatibilityIndexes = [
  {
    name: "Integration_providerKey_key",
    create: 'CREATE UNIQUE INDEX "Integration_providerKey_key" ON "Integration"("providerKey")',
  },
  {
    name: "Agent_key_key",
    create: 'CREATE UNIQUE INDEX "Agent_key_key" ON "Agent"("key")',
  },
];

function runSeedProcess() {
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(command, ["exec", "tsx", "prisma/seed.ts"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Prisma seed process exited with status ${result.status ?? "unknown"}`);
  }
}

async function main() {
  if (!needsDemoCompatibility) {
    runSeedProcess();
    return;
  }

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for demo seed compatibility setup");
  }

  const client = new Client({ connectionString: databaseUrl });
  const createdIndexes = [];

  await client.connect();
  try {
    const existing = await client.query(
      `SELECT indexname
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND indexname = ANY($1::text[])`,
      [compatibilityIndexes.map((index) => index.name)],
    );
    const existingNames = new Set(existing.rows.map((row) => row.indexname));

    for (const index of compatibilityIndexes) {
      if (existingNames.has(index.name)) continue;
      await client.query(index.create);
      createdIndexes.push(index.name);
    }

    runSeedProcess();
  } finally {
    for (const indexName of createdIndexes.reverse()) {
      await client.query(`DROP INDEX IF EXISTS "${indexName}"`);
    }
    await client.end();
  }
}

main().catch((error) => {
  console.error("Seed runner failed", error);
  process.exitCode = 1;
});
