import { describe, expect, it, vi } from "vitest";

import { executeTenantRoute } from "@/server/tenancy/tenant-route-service";

vi.mock("@/lib/tenancy/prisma-workspace", () => ({
  withPrismaWorkspace: vi.fn(
    async (
      _prisma: unknown,
      _context: unknown,
      work: (tx: unknown) => Promise<unknown>,
    ) => work(mockTx),
  ),
}));

const mockTx = {
  workspaceMember: {
    findFirst: vi.fn(),
  },
};

describe("executeTenantRoute", () => {
  it("executes work for an active member with sufficient role", async () => {
    mockTx.workspaceMember.findFirst.mockResolvedValueOnce({ role: "ADMIN" });
    const work = vi.fn().mockResolvedValue("ok");

    await expect(
      executeTenantRoute({
        prisma: {} as never,
        principal: { userId: "user-1" },
        workspaceId: "00000000-0000-4000-8000-000000000001",
        minimumRole: "OPERATOR",
        work,
      }),
    ).resolves.toBe("ok");

    expect(work).toHaveBeenCalledOnce();
  });

  it("denies missing membership", async () => {
    mockTx.workspaceMember.findFirst.mockResolvedValueOnce(null);

    await expect(
      executeTenantRoute({
        prisma: {} as never,
        principal: { userId: "user-1" },
        workspaceId: "00000000-0000-4000-8000-000000000001",
        work: vi.fn(),
      }),
    ).rejects.toThrow("Workspace access denied");
  });

  it("denies insufficient role", async () => {
    mockTx.workspaceMember.findFirst.mockResolvedValueOnce({ role: "VIEWER" });

    await expect(
      executeTenantRoute({
        prisma: {} as never,
        principal: { userId: "user-1" },
        workspaceId: "00000000-0000-4000-8000-000000000001",
        minimumRole: "ADMIN",
        work: vi.fn(),
      }),
    ).rejects.toThrow("Workspace access denied");
  });
});
