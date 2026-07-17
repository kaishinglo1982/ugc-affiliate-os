import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_ROOTS = ["src/lib", "src/features", "src/app"];
const ALLOW_MARKER = "tenant-scope-reviewed";
const SAFE_BOUNDARIES = [
  "src/lib/tenancy/",
  "src/lib/repositories/",
  "src/features/products/repository.ts",
  "src/features/campaigns/repository.ts",
];

const TENANT_DELEGATES = [
  "product",
  "affiliateProgram",
  "affiliateLink",
  "linkClick",
  "campaign",
  "script",
  "scriptVersion",
  "videoJob",
  "mediaAsset",
  "socialPost",
  "revenue",
  "expense",
  "encryptedCredential",
  "contentBrief",
  "workflowRun",
  "workflowStepRun",
  "approval",
  "agentToolCall",
  "analyticsEvent",
];

const delegatePattern = new RegExp(
  `\\bprisma\\.(?:${TENANT_DELEGATES.join("|")})\\b`,
);
const rawTenantSqlPattern = new RegExp(
  `(?:FROM|UPDATE|INTO|DELETE\\s+FROM)\\s+"(?:${TENANT_DELEGATES
    .map((name) => name[0].toUpperCase() + name.slice(1))
    .join("|")})"`,
  "i",
);
const scopedBoundaryPattern = /withPrismaWorkspace|executeTenantService|Prisma\.TransactionClient|workspaceId\s*:/;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (["node_modules", ".next", "generated"].includes(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.|\.spec\./.test(entry.name)) files.push(absolute);
  }
  return files;
}

const violations = [];
for (const relativeRoot of SOURCE_ROOTS) {
  const absoluteRoot = path.join(ROOT, relativeRoot);
  let files = [];
  try {
    files = await walk(absoluteRoot);
  } catch {
    continue;
  }

  for (const file of files) {
    const relativeFile = path.relative(ROOT, file).replaceAll("\\", "/");
    const source = await readFile(file, "utf8");
    if (source.includes(ALLOW_MARKER)) continue;

    const isApprovedBoundary = SAFE_BOUNDARIES.some((boundary) =>
      relativeFile.startsWith(boundary),
    );
    const usesGlobalTenantDelegate = delegatePattern.test(source);
    const usesTenantRawSql = rawTenantSqlPattern.test(source);
    const establishesScope = scopedBoundaryPattern.test(source);

    if (usesGlobalTenantDelegate && !isApprovedBoundary) {
      violations.push(`${relativeFile}: direct global Prisma tenant delegate`);
      continue;
    }

    if (usesTenantRawSql && !establishesScope && !isApprovedBoundary) {
      violations.push(`${relativeFile}: tenant SQL without scoped boundary`);
    }
  }
}

if (violations.length > 0) {
  console.error("Tenant scoping violations detected:");
  for (const violation of violations) console.error(`- ${violation}`);
  console.error(`Move access behind a scoped repository/service or add the audited marker: ${ALLOW_MARKER}`);
  process.exit(1);
}

console.log("Tenant scoping guard passed.");