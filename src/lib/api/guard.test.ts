import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("@/lib/auth/rbac", () => ({
  hasPermission: vi.fn(),
}));

import { requireApiPermission } from "@/lib/api/guard";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hasPermission } from "@/lib/auth/rbac";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireApiPermission", () => {
  it("returns the canonical 401 envelope for anonymous callers", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await requireApiPermission("workspace.view");

    expect(result).not.toBeNull();
    const response = result?.response;
    expect(response?.status).toBe(401);
    await expect(response?.json()).resolves.toMatchObject({
      ok: false,
      error: "Nicht authentifiziert.",
    });
  });

  it("returns the canonical 403 envelope when permission is missing", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(hasPermission).mockReturnValue(false);

    const result = await requireApiPermission("workspace.view");

    expect(result).not.toBeNull();
    const response = result?.response;
    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toMatchObject({
      ok: false,
      error: "Keine Berechtigung.",
    });
  });

  it("returns null for an authorized caller", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(hasPermission).mockReturnValue(true);

    await expect(requireApiPermission("workspace.view")).resolves.toBeNull();
  });
});
