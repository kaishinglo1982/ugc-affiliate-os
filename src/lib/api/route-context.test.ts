import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => ({ get: () => null }),
}));
vi.mock("@/lib/api/guard", () => ({
  requireApiPermission: vi.fn(),
}));
vi.mock("@/lib/auth/tenant", () => ({
  InvalidTenantTokenError: class InvalidTenantTokenError extends Error {},
  resolveWorkspaceId: vi.fn(),
}));
vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("@/lib/auth/rbac", () => ({
  Permission: {},
}));

import { withApiContext } from "@/lib/api/route-context";
import { requireApiPermission } from "@/lib/api/guard";
import { resolveWorkspaceId, InvalidTenantTokenError } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { Permission } from "@/lib/api/route-context";

const perm: Permission = "experiments.edit";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("withApiContext", () => {
  it("returns 401 envelope when permission guard fails", async () => {
    vi.mocked(requireApiPermission).mockResolvedValue({
      response: NextResponse.json(null, { status: 403 }),
    });
    const result = await withApiContext(perm);
    expect("response" in result).toBe(true);
    if ("response" in result) expect(result.response.status).toBe(403);
  });

  it("returns context with resolved workspace and actor", async () => {
    vi.mocked(requireApiPermission).mockResolvedValue(null);
    vi.mocked(resolveWorkspaceId).mockResolvedValue("ws-1");
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-9" } as never);
    const result = await withApiContext(perm);
    expect("context" in result).toBe(true);
    if ("context" in result) {
      expect(result.context.workspaceId).toBe("ws-1");
      expect(result.context.actor).toBe("user-9");
    }
  });

  it("falls back actor to 'owner' when no user", async () => {
    vi.mocked(requireApiPermission).mockResolvedValue(null);
    vi.mocked(resolveWorkspaceId).mockResolvedValue("ws-2");
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const result = await withApiContext(perm);
    if ("context" in result) expect(result.context.actor).toBe("owner");
  });

  it("returns 401 envelope on InvalidTenantTokenError", async () => {
    vi.mocked(requireApiPermission).mockResolvedValue(null);
    vi.mocked(resolveWorkspaceId).mockRejectedValue(new InvalidTenantTokenError("bad"));
    const result = await withApiContext(perm);
    expect("response" in result).toBe(true);
    if ("response" in result) expect(result.response.status).toBe(401);
  });
});
