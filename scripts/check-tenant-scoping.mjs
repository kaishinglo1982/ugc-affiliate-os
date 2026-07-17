import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_ROOTS = ["src/lib", "src/features", "src/app"];
const TENANT_TABLE_PATTERN = /FROM\s+"(?:Product|Campaign|WorkflowRun|WorkflowStepRun|Approval|AgentToolCall|AnalyticsEvent)"|UPDATE\s+"(?:Product|Campaign|WorkflowRun|WorkflowStepRun|Approval|AgentToolCall|AnalyticsEvent)"|DELETE\s+FROM\s+"(?:Product|Campaign|WorkflowRun|WorkflowStepRun|Approval|AgentToolCall|AnalyticsEvent)"/i;
const WORKSPACE_SCOPE_PATTERN = /"workspaceId"\s*=|workspaceId\s*:/;
const ALLOW_MARKER = "tenant-scope-reviewed";

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
    const source = await readFile(file, "utf8");
    if (source.includes(ALLOW_MARKER)) continue;
    if (TENANT_TABLE_PATTERN.test(source) && !WORKSPACE_SCOPE_PATTERN.test(source)) {
      violations.push(path.relative(ROOT, file));
    }
  }
}

if (violations.length > 0) {
  console.error("Tenant scoping violations detected:");
  for (const file of violations) console.error(`- ${file}`);
  console.error(`Add an explicit workspace scope or the audited marker: ${ALLOW_MARKER}`);
  process.exit(1);
}

console.log("Tenant scoping guard passed.");
