import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockHeaders = new Map<string, string>();
vi.mock("next/headers", () => ({
  headers: async () => ({ get: (k: string) => mockHeaders.get(k) ?? null }),
}));

const SECRET = "a".repeat(48);
const CORE_TENANT_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("resolveWorkspaceId", () => {
  beforeEach(() => {
    mockHeaders.clear();
    process.env.CARRYOS_TENANT_SECRET = SECRET;
    process.env.CARRYOS_INTEGRATION_MODE = "STANDALONE";
    delete process.env.CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON;
    vi.resetModules();
  });

  it("falls back to DEFAULT_WORKSPACE_ID only in standalone mode without a tenant assertion", async () => {
    const { resolveWorkspaceId } = await import("./tenant");
    const { DEFAULT_WORKSPACE_ID } = await import("@/lib/config/workspace");
    await expect(resolveWorkspaceId()).resolves.toBe(DEFAULT_WORKSPACE_ID);
  });

  it("fails closed without a tenant assertion in CORE_BOUND mode", async () => {
    process.env.CARRYOS_INTEGRATION_MODE = "CORE_BOUND";
    const { resolveWorkspaceId, InvalidTenantTokenError } = await import("./tenant");
    await expect(resolveWorkspaceId()).rejects.toBeInstanceOf(InvalidTenantTokenError);
  });

  it("maps a valid CarryOS tenant UUID to a separate local workspace id", async () => {
    process.env.CARRYOS_INTEGRATION_MODE = "CORE_BOUND";
    process.env.CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON = JSON.stringify({
      [CORE_TENANT_ID]: WORKSPACE_ID,
    });
    const { resolveWorkspaceId, signTenantToken } = await import("./tenant");
    const token = await signTenantToken(CORE_TENANT_ID);
    mockHeaders.set("x-carryos-tenant-token", token);

    await expect(resolveWorkspaceId()).resolves.toBe(WORKSPACE_ID);
    expect(WORKSPACE_ID).not.toBe(CORE_TENANT_ID);
  });

  it("rejects a valid token when the CarryOS tenant has no workspace binding", async () => {
    process.env.CARRYOS_INTEGRATION_MODE = "CORE_BOUND";
    process.env.CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON = JSON.stringify({});
    const { resolveWorkspaceId, signTenantToken, TenantWorkspaceBindingError } = await import("./tenant");
    const token = await signTenantToken(CORE_TENANT_ID);
    mockHeaders.set("x-carryos-tenant-token", token);

    await expect(resolveWorkspaceId()).rejects.toBeInstanceOf(TenantWorkspaceBindingError);
  });

  it("rejects malformed tenant/workspace binding configuration", async () => {
    process.env.CARRYOS_INTEGRATION_MODE = "CORE_BOUND";
    process.env.CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON = JSON.stringify({
      "not-a-core-uuid": WORKSPACE_ID,
    });
    const { resolveWorkspaceId, signTenantToken, TenantWorkspaceBindingError } = await import("./tenant");
    const token = await signTenantToken(CORE_TENANT_ID);
    mockHeaders.set("x-carryos-tenant-token", token);

    await expect(resolveWorkspaceId()).rejects.toBeInstanceOf(TenantWorkspaceBindingError);
  });

  it("rejects instead of falling back when the header is present but invalid", async () => {
    const { resolveWorkspaceId, InvalidTenantTokenError } = await import("./tenant");
    mockHeaders.set("x-carryos-tenant-token", "not-a-valid-jwt");
    await expect(resolveWorkspaceId()).rejects.toBeInstanceOf(InvalidTenantTokenError);
  });

  it("rejects a token signed with a different secret", async () => {
    process.env.CARRYOS_TENANT_SECRET = SECRET;
    const { signTenantToken } = await import("./tenant");
    const token = await signTenantToken(CORE_TENANT_ID);

    vi.resetModules();
    process.env.CARRYOS_TENANT_SECRET = "b".repeat(48);
    process.env.CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON = JSON.stringify({
      [CORE_TENANT_ID]: WORKSPACE_ID,
    });
    const { resolveWorkspaceId, InvalidTenantTokenError } = await import("./tenant");
    mockHeaders.set("x-carryos-tenant-token", token);
    await expect(resolveWorkspaceId()).rejects.toBeInstanceOf(InvalidTenantTokenError);
  });

  it("does not mint a tenant assertion for a non-UUID tenant id", async () => {
    const { signTenantToken } = await import("./tenant");
    await expect(signTenantToken("tenant-123")).rejects.toThrow("CarryOS tenantId must be a UUID");
  });
});
