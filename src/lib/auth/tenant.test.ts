import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockHeaders = new Map<string, string>();
vi.mock("next/headers", () => ({
  headers: async () => ({ get: (key: string) => mockHeaders.get(key) ?? null }),
}));

const SECRET = "a".repeat(48);
const CORE_TENANT_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("CarryOS tenant/workspace binding", () => {
  beforeEach(() => {
    mockHeaders.clear();
    process.env.CARRYOS_TENANT_SECRET = SECRET;
    process.env.CARRYOS_INTEGRATION_MODE = "STANDALONE";
    delete process.env.CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON;
    vi.resetModules();
  });

  it("uses DEFAULT_WORKSPACE_ID only in standalone mode without an assertion", async () => {
    const { resolveCarryOsTenantContext, resolveWorkspaceId } = await import("./tenant");
    const { DEFAULT_WORKSPACE_ID } = await import("@/lib/config/workspace");
    await expect(resolveCarryOsTenantContext()).resolves.toBeNull();
    await expect(resolveWorkspaceId()).resolves.toBe(DEFAULT_WORKSPACE_ID);
  });

  it("fails closed without a tenant assertion in CORE_BOUND mode", async () => {
    process.env.CARRYOS_INTEGRATION_MODE = "CORE_BOUND";
    const { InvalidTenantTokenError, resolveWorkspaceId } = await import("./tenant");
    await expect(resolveWorkspaceId()).rejects.toBeInstanceOf(InvalidTenantTokenError);
  });

  it("keeps Core tenant identity separate from the mapped local workspace", async () => {
    process.env.CARRYOS_INTEGRATION_MODE = "CORE_BOUND";
    process.env.CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON = JSON.stringify({
      [CORE_TENANT_ID]: WORKSPACE_ID,
    });
    const { resolveCarryOsTenantContext, resolveWorkspaceId, signTenantToken } = await import("./tenant");
    const token = await signTenantToken(CORE_TENANT_ID);
    mockHeaders.set("x-carryos-tenant-token", token);

    await expect(resolveCarryOsTenantContext()).resolves.toEqual({
      coreTenantId: CORE_TENANT_ID,
      workspaceId: WORKSPACE_ID,
    });
    await expect(resolveWorkspaceId()).resolves.toBe(WORKSPACE_ID);
    expect(WORKSPACE_ID).not.toBe(CORE_TENANT_ID);
  });

  it("rejects a valid tenant assertion without an explicit workspace binding", async () => {
    process.env.CARRYOS_INTEGRATION_MODE = "CORE_BOUND";
    process.env.CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON = JSON.stringify({});
    const { signTenantToken, TenantWorkspaceBindingError, resolveWorkspaceId } = await import("./tenant");
    mockHeaders.set("x-carryos-tenant-token", await signTenantToken(CORE_TENANT_ID));
    await expect(resolveWorkspaceId()).rejects.toBeInstanceOf(TenantWorkspaceBindingError);
  });

  it("rejects malformed tenant/workspace mappings", async () => {
    process.env.CARRYOS_INTEGRATION_MODE = "CORE_BOUND";
    process.env.CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON = JSON.stringify({
      "not-a-core-uuid": WORKSPACE_ID,
    });
    const { signTenantToken, TenantWorkspaceBindingError, resolveWorkspaceId } = await import("./tenant");
    mockHeaders.set("x-carryos-tenant-token", await signTenantToken(CORE_TENANT_ID));
    await expect(resolveWorkspaceId()).rejects.toBeInstanceOf(TenantWorkspaceBindingError);
  });

  it("rejects a forged assertion instead of falling back", async () => {
    const { InvalidTenantTokenError, resolveWorkspaceId } = await import("./tenant");
    mockHeaders.set("x-carryos-tenant-token", "not-a-valid-jwt");
    await expect(resolveWorkspaceId()).rejects.toBeInstanceOf(InvalidTenantTokenError);
  });

  it("rejects an assertion signed with another secret", async () => {
    const { signTenantToken } = await import("./tenant");
    const token = await signTenantToken(CORE_TENANT_ID);

    vi.resetModules();
    process.env.CARRYOS_TENANT_SECRET = "b".repeat(48);
    process.env.CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON = JSON.stringify({
      [CORE_TENANT_ID]: WORKSPACE_ID,
    });
    const { InvalidTenantTokenError, resolveWorkspaceId } = await import("./tenant");
    mockHeaders.set("x-carryos-tenant-token", token);
    await expect(resolveWorkspaceId()).rejects.toBeInstanceOf(InvalidTenantTokenError);
  });

  it("does not mint an assertion for a non-UUID Core tenant", async () => {
    const { signTenantToken } = await import("./tenant");
    await expect(signTenantToken("tenant-123")).rejects.toThrow("CarryOS tenantId must be a UUID");
  });
});
