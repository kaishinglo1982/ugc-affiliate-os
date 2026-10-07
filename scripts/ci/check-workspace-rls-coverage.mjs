#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/20261007180000_workspace_rls_full_activation/migration.sql", "utf8");
const failures = [];

if (!migration.includes("ENABLE ROW LEVEL SECURITY")) failures.push("RLS enable missing");
if (!migration.includes("FORCE ROW LEVEL SECURITY")) failures.push("FORCE RLS missing");
if (!migration.includes('current_workspace_id()')) failures.push("workspace context function missing");
if (!migration.includes('"workspaceId" = current_workspace_id()')) failures.push("workspace isolation policy missing");

const workspaceModels = [];
const modelBlocks = schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g);
for (const match of modelBlocks) {
  if (/^\s*workspaceId\s+String/m.test(match[2])) workspaceModels.push(match[1]);
}

if (workspaceModels.length < 50) failures.push(`unexpected workspace model count: ${workspaceModels.length}`);

const forbidden = [
  "ALTER TABLE .* DROP COLUMN",
  "DROP TABLE",
  "DROP DATABASE",
  "prisma db push",
];
for (const needle of forbidden) {
  if (new RegExp(needle, "i").test(migration)) failures.push(`destructive operation detected: ${needle}`);
}

if (failures.length) {
  console.error("UGC_RLS_COVERAGE_GATE_FAILED");
  failures.forEach((x) => console.error("- " + x));
  process.exit(1);
}

console.log(`UGC_RLS_COVERAGE_GATE_OK models=${workspaceModels.length}`);
