import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const roots = [
  "src/app/api",
  "src/server/services",
  "src/server/actions",
];

const allowedDirectClientImports = new Set([
  "src/app/api/health/database/route.ts",
  "src/server/actions/auth.ts",
  "src/server/actions/contact.ts",
  "src/server/actions/publishing.ts",
  "src/server/services/publishing.ts",
]);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      files.push(full);
    }
  }
  return files;
}

const violations = [];

for (const sourceRoot of roots) {
  const absolute = path.join(root, sourceRoot);
  if (!fs.existsSync(absolute)) continue;

  for (const file of walk(absolute)) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    const content = fs.readFileSync(file, "utf8");

    if (!content.includes('from "@/lib/db/client"')) continue;
    if (allowedDirectClientImports.has(relative)) continue;

    violations.push(relative);
  }
}

if (violations.length > 0) {
  console.error("Tenant DB boundary violations detected:");
  for (const file of violations.sort()) console.error(`- ${file}`);
  console.error(
    "Tenant-facing code must use tenantPrisma, tenantPrismaForWorkspace(), or withWorkspaceDb().",
  );
  process.exit(1);
}

console.log(
  `Tenant DB boundary check passed. Direct client allowlist: ${allowedDirectClientImports.size} files.`,
);
