import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const migrationsRoot = path.join(root, "prisma", "migrations");
const requiredFragments = [
  'ENABLE ROW LEVEL SECURITY',
  'FORCE ROW LEVEL SECURITY',
  'app.current_workspace_id',
  'FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")',
];

const migrationDirectories = await readdir(migrationsRoot, { withFileTypes: true });
let migrationSql = "";
for (const entry of migrationDirectories) {
  if (!entry.isDirectory()) continue;
  const migrationPath = path.join(migrationsRoot, entry.name, "migration.sql");
  try {
    migrationSql += `\n${await readFile(migrationPath, "utf8")}`;
  } catch {
    // Ignore incomplete non-migration directories; Prisma will reject them later.
  }
}

const violations = requiredFragments.filter((fragment) => !migrationSql.includes(fragment));

if (!migrationSql.includes('ON DELETE RESTRICT')) {
  violations.push("workspace foreign keys must use ON DELETE RESTRICT");
}
if (!migrationSql.includes('VALIDATE CONSTRAINT')) {
  violations.push("workspace foreign keys must be validated after creation");
}
if (!migrationSql.includes('orphan_count')) {
  violations.push("workspace foreign-key rollout must reject orphaned tenant rows");
}

if (violations.length > 0) {
  console.error("Tenancy migration contract violations detected:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log("Tenancy migration contract passed.");
