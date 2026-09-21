import { Client } from "pg";

const connectionString = process.env.DATABASE_RUNTIME_URL?.trim();
if (!connectionString) {
  console.error("DATABASE_RUNTIME_URL is required for the production runtime DB role gate.");
  process.exit(2);
}

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
     JOIN information_schema.columns col
       ON col.table_schema = n.nspname
      AND col.table_name = c.relname
      AND col.column_name = 'workspaceId'
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
     ORDER BY c.relname`,
  );

  if (tableResult.rows.length === 0) {
    throw new Error("NO_WORKSPACE_TABLES_FOUND");
  }

  const noRls = tableResult.rows.filter((row) => !row.relrowsecurity);
  if (noRls.length) {
    throw new Error(
      `RLS_NOT_ENABLED: ${noRls.map((row) => row.relname).join(", ")}`,
    );
  }

  const owned = tableResult.rows.filter((row) => row.owner === role.role_name);
  if (owned.length) {
    throw new Error(
      `RUNTIME_DB_ROLE_MUST_NOT_OWN_PROTECTED_TABLES: ${owned
        .map((row) => row.relname)
        .join(", ")}`,
    );
  }

  const forceRlsTables = tableResult.rows
    .filter((row) => row.relforcerowsecurity)
    .map((row) => row.relname);

  console.log(
    JSON.stringify(
      {
        role: role.role_name,
        rolsuper: role.rolsuper,
        rolbypassrls: role.rolbypassrls,
        protectedTableCount: tableResult.rows.length,
        forceRlsTableCount: forceRlsTables.length,
        forceRlsTables,
        forceRlsDecision:
          "Runtime isolation is enforced by NOBYPASSRLS + non-owner role; FORCE RLS remains intentionally optional for owner/admin paths.",
        verdict: "PASS",
      },
      null,
      2,
    ),
  );
} finally {
  await client.end().catch(() => undefined);
}
