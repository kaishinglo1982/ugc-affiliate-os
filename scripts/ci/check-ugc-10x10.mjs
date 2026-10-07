#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";

const failures = [];
const read = (p) => {
  if (!existsSync(p)) { failures.push(`missing: ${p}`); return ""; }
  return readFileSync(p, "utf8");
};

const schema = read("prisma/schema.prisma");
const ci = read(".github/workflows/ci.yml");
const rls = read("prisma/migrations/20261007180000_workspace_rls_full_activation/migration.sql");
const tx = read("src/lib/db/workspace-transaction.ts");
const isolation = read("tests/security/cross-workspace-isolation.test.ts");
const core = read("scripts/ci/check-core-bound.mjs");

const workspaceModels = [...schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)]
  .filter((m) => /^\s*workspaceId\s+String/m.test(m[2])).map((m) => m[1]);

if (workspaceModels.length < 50) failures.push("workspace model inventory unexpectedly small");
for (const needle of [
  "ENABLE ROW LEVEL SECURITY",
  "FORCE ROW LEVEL SECURITY",
  "current_workspace_id()",
  '"workspaceId" = current_workspace_id()',
]) if (!rls.includes(needle)) failures.push(`RLS gate missing: ${needle}`);

for (const needle of [
  "prisma.$transaction",
  "set_config('app.current_workspace_id'",
  "true)",
]) if (!tx.includes(needle)) failures.push(`transaction context missing: ${needle}`);

for (const needle of [
  "cross-workspace",
  "FORCE ROW LEVEL SECURITY",
  "WITH CHECK",
]) if (!isolation.includes(needle)) failures.push(`negative isolation test missing: ${needle}`);

for (const needle of [
  "CORE_BOUND installation and provider gate",
  "Apply migrations",
  "Unit and integration tests",
  "Build",
]) if (!ci.includes(needle)) failures.push(`CI stage missing: ${needle}`);

if (!ci.includes("Run e2e tests") || !ci.includes("playwright install --with-deps chromium"))
  failures.push("E2E CI execution missing");

for (const needle of [
  "CarryOsPluginBinding",
  "requireCarryOsUgcBinding",
  "servicePrincipalId",
]) {
  if (!core.includes(needle) && !read("src/lib/auth/carryos-plugin-binding.ts").includes(needle)) {
    failures.push(`binding contract missing: ${needle}`);
  }
}

if (failures.length) {
  console.error("UGC_10X10_GATE_FAILED");
  failures.forEach((f) => console.error("- " + f));
  process.exit(1);
}

console.log(`UGC_10X10_GATE_STATIC_OK workspaceModels=${workspaceModels.length}`);
