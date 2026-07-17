import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
const checkOnly = process.argv.includes("--check");
const DEFAULT_WORKSPACE = "00000000-0000-0000-0000-000000000001";

const tenantModels = [
  "Product",
  "AffiliateProgram",
  "AffiliateLink",
  "LinkClick",
  "Campaign",
  "Script",
  "ScriptVersion",
  "VideoJob",
  "MediaAsset",
  "SocialPost",
  "Revenue",
  "Expense",
  "EncryptedCredential",
  "ContentBrief",
  "WorkflowRun",
  "WorkflowStepRun",
  "Approval",
  "AgentToolCall",
  "AnalyticsEvent",
];

const workspaceBlock = `
enum WorkspaceStatus {
  ACTIVE
  SUSPENDED
  ARCHIVED
}

enum WorkspaceMemberRole {
  OWNER
  ADMIN
  OPERATOR
  VIEWER
}

enum WorkspaceMemberStatus {
  INVITED
  ACTIVE
  SUSPENDED
  REMOVED
}

model Workspace {
  id        String          @id @default(uuid())
  name      String
  slug      String          @unique
  status    WorkspaceStatus @default(ACTIVE)
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  members WorkspaceMember[]
${tenantModels.map((model) => `  ${model[0].toLowerCase()}${model.slice(1)}s ${model}[]`).join("\n")}
}

model WorkspaceMember {
  id          String                @id @default(uuid())
  workspaceId String
  workspace   Workspace             @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  userId      String
  user        User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  role        WorkspaceMemberRole   @default(VIEWER)
  status      WorkspaceMemberStatus @default(INVITED)
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt

  @@unique([workspaceId, userId])
  @@index([userId, status])
  @@index([workspaceId, status])
}
`;

function modelRange(source, modelName) {
  const marker = `model ${modelName} {`;
  const start = source.indexOf(marker);
  if (start < 0) return null;
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return { start, end: index + 1 };
    }
  }
  throw new Error(`Unclosed Prisma model: ${modelName}`);
}

function updateModel(source, modelName, transform) {
  const range = modelRange(source, modelName);
  if (!range) throw new Error(`Prisma model not found: ${modelName}`);
  const current = source.slice(range.start, range.end);
  const next = transform(current);
  return source.slice(0, range.start) + next + source.slice(range.end);
}

function ensureField(model, fieldLine, anchor = /\n\s*id\s+/) {
  const fieldName = fieldLine.trim().split(/\s+/)[0];
  if (new RegExp(`\\n\\s*${fieldName}\\s+`).test(model)) return model;
  const match = model.match(anchor);
  if (!match || match.index === undefined) throw new Error(`Cannot insert ${fieldName}`);
  const lineEnd = model.indexOf("\n", match.index + 1);
  return model.slice(0, lineEnd + 1) + fieldLine + "\n" + model.slice(lineEnd + 1);
}

function ensureBeforeClosing(model, line) {
  if (model.includes(line.trim())) return model;
  const closing = model.lastIndexOf("}");
  return model.slice(0, closing) + `\n${line}\n` + model.slice(closing);
}

let source = await readFile(schemaPath, "utf8");
const original = source;

source = source.replace(
  "// Single-user system. All monetary values use Decimal. Timestamps are UTC;",
  "// Multi-tenant system. Workspace is the canonical tenant boundary. Monetary values use Decimal.",
);

source = source.replace(
  new RegExp(`\\s+@default\\(\"${DEFAULT_WORKSPACE}\"\\)`, "g"),
  "",
);

source = updateModel(source, "User", (model) => {
  if (model.includes("workspaceMemberships")) return model;
  return ensureBeforeClosing(model, "  workspaceMemberships WorkspaceMember[]");
});

if (!source.includes("model Workspace {")) {
  const sessionRange = modelRange(source, "Session");
  if (!sessionRange) throw new Error("Session model not found");
  source = source.slice(0, sessionRange.end) + "\n" + workspaceBlock + source.slice(sessionRange.end);
}

for (const modelName of tenantModels) {
  source = updateModel(source, modelName, (model) => {
    let next = ensureField(model, "  workspaceId String");
    next = ensureField(
      next,
      "  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Restrict)",
      /\n\s*workspaceId\s+/,
    );
    next = ensureBeforeClosing(next, "  @@index([workspaceId])");
    return next;
  });
}

const violations = [];
if (source.includes(`@default(\"${DEFAULT_WORKSPACE}\")`)) {
  violations.push("fixed workspace default remains");
}
for (const modelName of tenantModels) {
  const range = modelRange(source, modelName);
  const model = range ? source.slice(range.start, range.end) : "";
  if (!/\n\s*workspaceId\s+String\b/.test(model)) violations.push(`${modelName}: missing workspaceId`);
  if (!/\n\s*workspace\s+Workspace\b/.test(model)) violations.push(`${modelName}: missing Workspace relation`);
}
if (!source.includes("model WorkspaceMember {")) violations.push("WorkspaceMember model missing");
if (!source.includes("workspaceMemberships WorkspaceMember[]")) violations.push("User membership relation missing");

if (violations.length > 0) {
  console.error("Prisma tenancy reconciliation failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

if (checkOnly && source !== original) {
  console.error("Prisma schema is not reconciled. Run: pnpm run db:reconcile-tenancy");
  process.exit(1);
}

if (!checkOnly && source !== original) {
  await writeFile(schemaPath, source, "utf8");
  console.log("Prisma tenancy schema reconciled.");
} else {
  console.log("Prisma tenancy schema is reconciled.");
}
