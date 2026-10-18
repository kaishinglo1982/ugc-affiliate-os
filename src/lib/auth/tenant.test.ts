import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockHeaders = new Map<string, string>();
vi.mock("next/headers", () => ({
  headers: async () => ({ get: (k: string) => mockHeaders.get(k) ?? null }),
}));

const SECRET = "a".repeat(48);
const TENANT_ID = "11111111-1111-4111-8111-111111111111";

describe("resolveWorkspaceId", () => {
  beforeEach(() => {
    mockHeaders.clear();
    process.env.CARRYOS_TENANT_SECRET = SECRET;
    delete process.env.CARRYOS_INTEGRATION_MODE;
    vi.resetModules();
  });

  it("falls back to DEFAULT_WORKSPACE_ID when no tenant header is present", async () => {
    const { resolveWorkspaceId } = await import("./tenant");
    const { DEFAULT_WORKSPACE_ID } = await import("@/lib/config/workspace");
    await expect(resolveWorkspaceId()).resolves.toBe(DEFAULT_WORKSPACE_ID);
  });

  it("returns the tenantId from a validly signed token", async () => {
    const { resolveWorkspaceId, signTenantToken } = await import("./tenant");
    const token = await signTenantToken(TENANT_ID);
    mockHeaders.set("x-carryos-tenant-token", token);
    await expect(resolveWorkspaceId()).resolves.toBe(TENANT_ID);
  });

  it("rejects instead of falling back when the header is present but invalid", async () => {
    const { resolveWorkspaceId, InvalidTenantTokenError } = await import("./tenant");
    mockHeaders.set("x-carryos-tenant-token", "not-a-valid-jwt");
    await expect(resolveWorkspaceId()).rejects.toBeInstanceOf(InvalidTenantTokenError);
  });

  it("accepts a UUIDv7 tenant id when issuing and resolving a token", async () => {
    const tenantIdV7 = "01890f3e-7c00-7000-8000-000000000001";
    const { resolveWorkspaceId, signTenantToken } = await import("./tenant");
    const token = await signTenantToken(tenantIdV7);
    mockHeaders.set("x-carryos-tenant-token", token);
    await expect(resolveWorkspaceId()).resolves.toBe(tenantIdV7);
  });

  it("rejects a non-UUID tenant id before issuing a tenant token", async () => {
    const { signTenantToken } = await import("./tenant");
    await expect(signTenantToken("tenant-123")).rejects.toThrow("tenantId must be a UUID");
  });

  it("rejects a token signed with a different secret", async () => {
    const { signTenantToken } = await import("./tenant");
    const token = await signTenantToken(TENANT_ID);

    vi.resetModules();
    process.env.CARRYOS_TENANT_SECRET = "b".repeat(48);
    const { resolveWorkspaceId, InvalidTenantTokenError } = await import("./tenant");
    mockHeaders.set("x-carryos-tenant-token", token);
    await expect(resolveWorkspaceId()).rejects.toBeInstanceOf(InvalidTenantTokenError);
  });
});
