#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const failures = [];

function read(path) {
  if (!existsSync(path)) {
    failures.push(`missing: ${path}`);
    return "";
  }
  return readFileSync(path, "utf8");
}

const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20261007170000_core_bound_installation_reconciliation/migration.sql");
const guard = read("src/lib/api/guard.ts");
const binding = read("src/lib/auth/carryos-plugin-binding.ts");
const aiClient = read("src/lib/carryos/ugc-ai-client.ts");

for (const needle of [
  "model CarryOsPluginBinding",
  "model AgentCapabilityRegistration",
  "model AgentCapacityReservation",
  "claimToken",
  "leaseExpiresAt",
]) {
  if (!schema.includes(needle)) failures.push(`schema missing: ${needle}`);
}

for (const needle of [
  'CREATE TABLE IF NOT EXISTS "CarryOsPluginBinding"',
  'CREATE TABLE IF NOT EXISTS "AgentCapabilityRegistration"',
  'CREATE TABLE IF NOT EXISTS "AgentCapacityReservation"',
  'ALTER TABLE "WorkflowStepRun"',
  '"WorkflowStepRun_claimable_idx"',
]) {
  if (!migration.includes(needle)) failures.push(`migration missing: ${needle}`);
}

for (const needle of [
  "requireCarryOsUgcBinding",
  "resolveCarryOsTenantId",
  "CARRYOS_INTEGRATION_MODE",
]) {
  if (!guard.includes(needle)) failures.push(`guard missing: ${needle}`);
}

for (const needle of [
  "status: \"ACTIVE\"",
  "revokedAt: null",
  "servicePrincipalId",
  "pluginInstallationId",
]) {
  if (!binding.includes(needle)) failures.push(`binding guard missing: ${needle}`);
}

for (const needle of [
  "CARRYOS_API_URL",
  "CARRYOS_SERVICE_PRINCIPAL_TOKEN",
  "CARRYOS_UGC_CONTRACT_VERSION",
  "/api/v1/plugins/ugc/execute",
]) {
  if (!aiClient.includes(needle)) failures.push(`AI boundary missing: ${needle}`);
}

const providerDir = "src/lib/providers";
if (existsSync(providerDir)) {
  const stack = [providerDir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of readdirSync(current)) {
      const path = join(current, entry);
      if (statSync(path).isDirectory()) stack.push(path);
      else if (/\.(ts|tsx)$/.test(path)) {
        const source = readFileSync(path, "utf8");
        if (
          source.includes("CARRYOS_INTEGRATION_MODE") &&
          source.includes("CORE_BOUND") &&
          source.includes("templateScriptProvider") &&
          !source.includes("return carryOsScriptProvider")
        ) {
          failures.push(`CORE_BOUND provider fallback detected: ${path}`);
        }
      }
    }
  }
}

if (failures.length) {
  console.error("UGC_CORE_BOUND_GATE_FAILED");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("UGC_CORE_BOUND_GATE_OK");
