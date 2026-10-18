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

  it("preserves the existing STANDALONE production mode", () => {
    expect(() => validateTenantModeConfiguration({
      NODE_ENV: "production",
      CARRYOS_INTEGRATION_MODE: "STANDALONE",
    })).not.toThrow();
  });

  it("requires the tenant secret and both binding maps in CORE_BOUND mode", () => {
    expect(() => validateTenantModeConfiguration({
      NODE_ENV: "test",
      CARRYOS_INTEGRATION_MODE: "CORE_BOUND",
    })).toThrow(/CARRYOS_TENANT_SECRET/);
  });

  it("rejects reuse of AUTH_SECRET as the tenant signing secret", () => {
    const sharedSecret = "s".repeat(32);
    expect(() => validateTenantModeConfiguration({
      NODE_ENV: "test",
      CARRYOS_INTEGRATION_MODE: "CORE_BOUND",
      AUTH_SECRET: sharedSecret,
      CARRYOS_TENANT_SECRET: sharedSecret,
      CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON: JSON.stringify({ [TENANT_ID]: WORKSPACE_ID }),
      CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON: JSON.stringify({ [WORKSPACE_ID]: { [USER_ID]: "admin" } }),
    })).toThrow(/CARRYOS_TENANT_SECRET must differ from AUTH_SECRET/);
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

  it("rejects a workspace with no explicit user-role binding", () => {
    expect(() => validateTenantModeConfiguration({
      NODE_ENV: "production",
      CARRYOS_INTEGRATION_MODE: "CORE_BOUND",
      AUTH_SECRET: "a".repeat(32),
      CARRYOS_TENANT_SECRET: "s".repeat(32),
      CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON: JSON.stringify({ [TENANT_ID]: WORKSPACE_ID }),
      CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON: JSON.stringify({ [WORKSPACE_ID]: {} }),
    })).toThrow(/CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON must contain a non-empty, valid binding object/);
  });

  it("rejects a tenant mapping whose workspace has no role bindings", () => {
    const otherWorkspaceId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    expect(() => validateTenantModeConfiguration({
      NODE_ENV: "production",
      CARRYOS_INTEGRATION_MODE: "CORE_BOUND",
      AUTH_SECRET: "a".repeat(32),
      CARRYOS_TENANT_SECRET: "s".repeat(32),
      CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON: JSON.stringify({ [TENANT_ID]: otherWorkspaceId }),
      CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON: JSON.stringify({ [WORKSPACE_ID]: { [USER_ID]: "admin" } }),
    })).toThrow(/Every workspace referenced by CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON/);
  });

  it("accepts RFC 9562 UUIDv7 identifiers in tenant and role bindings", () => {
    const tenantIdV7 = "01890f3e-7c00-7000-8000-000000000001";
    const workspaceIdV7 = "01890f3e-7c00-7000-8000-000000000002";
    const userIdV7 = "01890f3e-7c00-7000-8000-000000000003";

    expect(() => validateTenantModeConfiguration({
      NODE_ENV: "production",
      CARRYOS_INTEGRATION_MODE: "CORE_BOUND",
      AUTH_SECRET: "a".repeat(32),
      CARRYOS_TENANT_SECRET: "s".repeat(32),
      CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON: JSON.stringify({ [tenantIdV7]: workspaceIdV7 }),
      CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON: JSON.stringify({ [workspaceIdV7]: { [userIdV7]: "admin" } }),
    })).not.toThrow();
  });

  it("accepts valid, explicit CORE_BOUND tenant and role bindings", () => {
    expect(() => validateTenantModeConfiguration({
      NODE_ENV: "production",
      CARRYOS_INTEGRATION_MODE: "CORE_BOUND",
      AUTH_SECRET: "a".repeat(32),
      CARRYOS_TENANT_SECRET: "s".repeat(32),
      CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON: JSON.stringify({ [TENANT_ID]: WORKSPACE_ID }),
      CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON: JSON.stringify({ [WORKSPACE_ID]: { [USER_ID]: "admin" } }),
    })).not.toThrow();
  });
});
