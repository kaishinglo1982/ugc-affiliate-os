#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "APP_URL",
  "APP_BASE_URL",
  "CARRYOS_INTEGRATION_MODE",
  "CARRYOS_TENANT_SECRET",
  "CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON",
  "CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON",
  "CARRYOS_API_URL",
  "CARRYOS_UGC_EXECUTE_PATH",
  "CARRYOS_UGC_CONTRACT_VERSION",
  "CARRYOS_UGC_SERVICE_PRINCIPAL_BINDINGS_JSON",
  "UGC_SERVICE_TOKEN",
  "UGC_CREATOR_REVENUE_WORKSPACE_ID",
  "WORKER_SECRET",
  "CRON_SECRET",
  "CREDENTIAL_ENCRYPTION_KEY",
];

function envKeys(file) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  return new Set(
    text.split(/\r?\n/)
      .map((line) => line.match(/^([A-Z][A-Z0-9_]+)=/))
      .filter(Boolean)
      .map((match) => match[1]),
  );
}

for (const file of [".env.example", ".env.production.example"]) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}`);
  const keys = envKeys(file);
  const missing = required.filter((key) => !keys.has(key));
  if (missing.length) throw new Error(`${file}: missing ${missing.join(", ")}`);
}

if (process.env.PHASE3_PRODUCTION_GATE === "true") {
  const get = (key) => process.env[key]?.trim() ?? "";
  const errors = [];
  if (get("CARRYOS_INTEGRATION_MODE") !== "CORE_BOUND") {
    errors.push("CARRYOS_INTEGRATION_MODE must be CORE_BOUND");
  }
  for (const key of required) {
    if (!get(key)) errors.push(`${key} is not configured`);
  }
  if (get("CARRYOS_UGC_EXECUTE_PATH") !== "/api/v1/plugins/ugc/execute") {
    errors.push("CARRYOS_UGC_EXECUTE_PATH must be /api/v1/plugins/ugc/execute");
  }
  if (!/^https:\/\//.test(get("CARRYOS_API_URL"))) {
    errors.push("CARRYOS_API_URL must be an HTTPS URL");
  }
  if (get("CARRYOS_UGC_CONTRACT_VERSION") !== "2026-09-16.v1") {
    errors.push("CARRYOS_UGC_CONTRACT_VERSION must be 2026-09-16.v1");
  }
  for (const key of ["AUTH_SECRET", "CARRYOS_TENANT_SECRET", "UGC_SERVICE_TOKEN", "WORKER_SECRET", "CRON_SECRET"]) {
    if (get(key).length < 32) errors.push(`${key} must be at least 32 characters`);
  }
  if (get("AUTH_SECRET") === get("CARRYOS_TENANT_SECRET")) {
    errors.push("AUTH_SECRET and CARRYOS_TENANT_SECRET must differ");
  }
  if (!/^[0-9a-f]{64}$/i.test(get("CREDENTIAL_ENCRYPTION_KEY"))) {
    errors.push("CREDENTIAL_ENCRYPTION_KEY must be exactly 64 hexadecimal characters");
  }
  for (const key of ["CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON", "CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON", "CARRYOS_UGC_SERVICE_PRINCIPAL_BINDINGS_JSON"]) {
    try {
      JSON.parse(get(key));
    } catch {
      errors.push(`${key} must contain valid JSON`);
    }
  }
  if (get("DEFAULT_WORKSPACE_ID")) {
    errors.push("DEFAULT_WORKSPACE_ID must remain empty in the production CORE_BOUND gate");
  }
  for (const key of ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "MISTRAL_API_KEY", "OPENROUTER_API_KEY", "HUGGINGFACE_API_KEY"]) {
    if (get(key)) errors.push(`${key} must be empty in governed CORE_BOUND production`);
  }
  if (errors.length) {
    console.error("Phase 3 production contract FAILED:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log("Phase 3 production contract: PASS");
} else {
  console.log("Phase 3 contract files: PASS (runtime gate skipped; set PHASE3_PRODUCTION_GATE=true for production validation)");
}
