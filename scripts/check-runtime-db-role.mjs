import { Client } from "pg";

const connectionString = process.env.DATABASE_RUNTIME_URL?.trim();
if (!connectionString) {
  console.error("DATABASE_RUNTIME_URL is required for the production runtime DB role gate.");
  process.exit(2);
}

const protectedTables = [
  "Product",
  "AffiliateProgram",
  "AffiliateLink",
  "LinkClick",
  "Campaign",
  "Script",
  "VideoJob",
  "MediaAsset",
  "SocialAccount",
  "SocialPost",
  "Revenue",
  "Expense",
  "TaxSetting",
  "Integration",
  "EncryptedCredential",
  "Agent",
  "AgentRun",
  "AuditLog",
  "Notification",
  "AgentMemoryEntry",
];

const client = new Client({ connectionString });

try {
  await client.connect();

  const roleResult = await client.query(
    `SELECT current_user AS role_name, r.rolsuper, r.rolbypassrls
     FROM pg_roles r
     WHERE r.rolname = current_user`,
  );

  const role = roleResult.rows[0];
  if (!role) throw new Error("RUNTIME_DB_ROLE_NOT_FOUND");
  if (role.rolsuper) throw new Error("RUNTIME_DB_ROLE_MUST_NOT_BE_SUPERUSER");
  if (role.rolbypassrls) throw new Error("RUNTIME_DB_ROLE_MUST_BE_NOBYPASSRLS");

  const tableResult = await client.query(
    `SELECT
       c.relname,
       c.relrowsecurity,
       c.relforcerowsecurity,
       pg_get_userbyid(c.relowner) AS owner
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND c.relname = ANY($1::text[])
     ORDER BY c.relname`,
    [protectedTables],
  );

  const byName = new Map(tableResult.rows.map((row) => [row.relname, row]));
  const missing = protectedTables.filter((name) => !byName.has(name));
  if (missing.length) {
    throw new Error(`RLS_PROTECTED_TABLES_MISSING: ${missing.join(", ")}`);
  }

  const noRls = protectedTables.filter((name) => !byName.get(name)?.relrowsecurity);
  if (noRls.length) {
    throw new Error(`RLS_NOT_ENABLED: ${noRls.join(", ")}`);
  }

  const owned = protectedTables.filter((name) => byName.get(name)?.owner === role.role_name);
  if (owned.length) {
    throw new Error(`RUNTIME_DB_ROLE_MUST_NOT_OWN_PROTECTED_TABLES: ${owned.join(", ")}`);
  }

  const forceRlsTables = protectedTables.filter((name) => byName.get(name)?.relforcerowsecurity);

  console.log(
    JSON.stringify(
      {
        role: role.role_name,
        rolsuper: role.rolsuper,
        rolbypassrls: role.rolbypassrls,
        protectedTableCount: protectedTables.length,
        forceRlsTableCount: forceRlsTables.length,
        forceRlsTables,
        verdict: "PASS",
      },
      null,
      2,
    ),
  );
} finally {
  await client.end().catch(() => undefined);
}
