import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockHeaders = new Map<string, string>();
vi.mock("next/headers", () => ({
  headers: async () => ({ get: (k: string) => mockHeaders.get(k) ?? null }),
}));

const SECRET = "a".repeat(48);
const findUnique = vi.fn();
vi.mock("@/lib/db/client", () => ({ prisma: { carryOSTenantBinding: { findUnique } } }));

describe("resolveWorkspaceId", () => {
  beforeEach(() => {
    findUnique.mockReset();
    mockHeaders.clear();
    process.env.CARRYOS_TENANT_SECRET = SECRET;
    vi.resetModules();
  });

  it("falls back to DEFAULT_WORKSPACE_ID when no tenant header is present", async () => {
    const { resolveWorkspaceId } = await import("./tenant");
    const { DEFAULT_WORKSPACE_ID } = await import("@/lib/config/workspace");
    await expect(resolveWorkspaceId()).resolves.toBe(DEFAULT_WORKSPACE_ID);
  });

  it("resolves a valid tenant token through an active workspace binding", async () => {
    const { resolveWorkspaceId, signTenantToken } = await import("./tenant");
    const token = await signTenantToken("tenant-123");
    mockHeaders.set("x-carryos-tenant-token", token);
    findUnique.mockResolvedValue({ workspaceId: "workspace-123", active: true });
    await expect(resolveWorkspaceId()).resolves.toBe("workspace-123");
  });

  it("rejects a valid tenant token without an active workspace binding", async () => {
    const { resolveWorkspaceId, signTenantToken, TenantWorkspaceBindingError } = await import("./tenant");
    const token = await signTenantToken("tenant-unbound");
    mockHeaders.set("x-carryos-tenant-token", token);
    findUnique.mockResolvedValue(null);
    await expect(resolveWorkspaceId()).rejects.toBeInstanceOf(TenantWorkspaceBindingError);
  });

  it("rejects instead of falling back when the header is present but invalid", async () => {
    const { resolveWorkspaceId, InvalidTenantTokenError } = await import("./tenant");
    mockHeaders.set("x-carryos-tenant-token", "not-a-valid-jwt");
    await expect(resolveWorkspaceId()).rejects.toBeInstanceOf(InvalidTenantTokenError);
  });

  it("rejects an inactive workspace binding", async () => {
    const { resolveWorkspaceId, signTenantToken, TenantWorkspaceBindingError } = await import("./tenant");
    const token = await signTenantToken("tenant-inactive");
    mockHeaders.set("x-carryos-tenant-token", token);
    findUnique.mockResolvedValue({ workspaceId: "workspace-inactive", active: false });
    await expect(resolveWorkspaceId()).rejects.toBeInstanceOf(TenantWorkspaceBindingError);
  });

  it("rejects a token signed with a different secret", async () => {
    process.env.CARRYOS_TENANT_SECRET = SECRET;
    const { signTenantToken } = await import("./tenant");
    const token = await signTenantToken("tenant-123");

    vi.resetModules();
    process.env.CARRYOS_TENANT_SECRET = "b".repeat(48);
    const { resolveWorkspaceId, InvalidTenantTokenError } = await import("./tenant");
    mockHeaders.set("x-carryos-tenant-token", token);
    await expect(resolveWorkspaceId()).rejects.toBeInstanceOf(InvalidTenantTokenError);
  });
});
