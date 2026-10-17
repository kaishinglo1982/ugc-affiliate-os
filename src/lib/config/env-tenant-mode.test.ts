import { afterEach, describe, expect, it } from "vitest";
import { validateTenantModeConfiguration } from "./env";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const originalEnv = { ...process.env };
afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
});

describe("validateTenantModeConfiguration", () => {
  it("requires an explicit tenancy mode in production", () => {
    expect(() => validateTenantModeConfiguration({ NODE_ENV: "production" }))
      .toThrow(/CARRYOS_INTEGRATION_MODE must be explicitly set/);
  });

  it("accepts an explicitly configured single-tenant production mode", () => {
    expect(() => validateTenantModeConfiguration({
      NODE_ENV: "production",
      CARRYOS_INTEGRATION_MODE: "SINGLE_TENANT",
    })).not.toThrow();
  });

  it("requires the tenant secret and both binding maps in CORE_BOUND mode", () => {
    expect(() => validateTenantModeConfiguration({
      NODE_ENV: "test",
      CARRYOS_INTEGRATION_MODE: "CORE_BOUND",
    })).toThrow(/CARRYOS_TENANT_SECRET/);
  });

  it("rejects malformed tenant binding JSON", () => {
    expect(() => validateTenantModeConfiguration({
      NODE_ENV: "test",
      CARRYOS_INTEGRATION_MODE: "CORE_BOUND",
      CARRYOS_TENANT_SECRET: "s".repeat(32),
      CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON: "{invalid",
      CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON: JSON.stringify({ [WORKSPACE_ID]: { [USER_ID]: "admin" } }),
    })).toThrow(/CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON must contain valid JSON/);
  });

  it("accepts valid, explicit CORE_BOUND tenant and role bindings", () => {
    expect(() => validateTenantModeConfiguration({
      NODE_ENV: "production",
      CARRYOS_INTEGRATION_MODE: "CORE_BOUND",
      CARRYOS_TENANT_SECRET: "s".repeat(32),
      CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON: JSON.stringify({ [TENANT_ID]: WORKSPACE_ID }),
      CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON: JSON.stringify({ [WORKSPACE_ID]: { [USER_ID]: "admin" } }),
    })).not.toThrow();
  });
});
