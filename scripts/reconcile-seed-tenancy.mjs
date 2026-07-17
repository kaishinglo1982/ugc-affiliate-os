import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const seedPath = path.join(process.cwd(), "prisma/seed.ts");
const productCorePath = path.join(process.cwd(), "src/features/products/application/core.ts");
const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";
const tenantModels = [
  "product",
  "affiliateProgram",
  "affiliateLink",
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

let source = await readFile(seedPath, "utf8");
const original = source;

if (!source.includes("const DEFAULT_WORKSPACE_ID =")) {
  const anchor = "const ALLOW_DEMO_SEED = process.env.ALLOW_DEMO_SEED === \"true\";";
  if (!source.includes(anchor)) throw new Error("Seed tenancy anchor not found");
  source = source.replace(anchor, `${anchor}\nconst DEFAULT_WORKSPACE_ID = "${DEFAULT_WORKSPACE_ID}";`);
}

for (const model of tenantModels) {
  const pattern = new RegExp(`(prisma\\.${model}\\.create\\(\\{\\s*data:\\s*\\{)(?!\\s*workspaceId:)`, "g");
  source = source.replace(pattern, `$1\n        workspaceId: DEFAULT_WORKSPACE_ID,`);
}

if (source.includes("const rows: Array<{ linkId: string; occurredAt: Date; source: string | null }>")) {
  source = source.replace(
    "const rows: Array<{ linkId: string; occurredAt: Date; source: string | null }>",
    "const rows: Array<{ workspaceId: string; linkId: string; occurredAt: Date; source: string | null }>",
  );
  source = source.replace(
    "rows.push({ linkId: link.id, occurredAt: date, source: link.platform });",
    "rows.push({ workspaceId: DEFAULT_WORKSPACE_ID, linkId: link.id, occurredAt: date, source: link.platform });",
  );
}

if (!source.includes("workspaceId: DEFAULT_WORKSPACE_ID")) {
  throw new Error("Seed tenancy reconciliation produced no workspace assignments");
}

if (source !== original) {
  await writeFile(seedPath, source, "utf8");
  console.log("Prisma seed tenancy reconciled.");
} else {
  console.log("Prisma seed tenancy is reconciled.");
}

let productCore = await readFile(productCorePath, "utf8");
const originalProductCore = productCore;

productCore = productCore.replace(
  "async function ensureProgram(tx: Tx, provider: AffiliateNetwork): Promise<string> {",
  "async function ensureProgram(tx: Tx, provider: AffiliateNetwork, workspaceId: string): Promise<string> {",
);
productCore = productCore.replace(
  'create: { id, provider, mode: "MOCK" },',
  'create: { id, workspaceId, provider, mode: "MOCK" },',
);
productCore = productCore.replaceAll(
  "ensureProgram(prisma, provider)",
  "ensureProgram(prisma, provider, workspaceId)",
);
productCore = productCore.replaceAll(
  "ensureProgram(tx, provider)",
  "ensureProgram(tx, provider, workspaceId)",
);

if (!productCore.includes('create: { id, workspaceId, provider, mode: "MOCK" }')) {
  throw new Error("Product core affiliate-program tenancy reconciliation failed");
}

if (productCore !== originalProductCore) {
  await writeFile(productCorePath, productCore, "utf8");
  console.log("Product core tenancy reconciled.");
} else {
  console.log("Product core tenancy is reconciled.");
}
