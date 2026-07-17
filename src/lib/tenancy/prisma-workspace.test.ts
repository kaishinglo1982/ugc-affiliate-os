import { describe, expect, it, vi } from "vitest";

import { withPrismaWorkspace } from "@/lib/tenancy/prisma-workspace";

describe("withPrismaWorkspace", () => {
  it("sets fail-closed tenant settings before application work", async () => {
    const executeRaw = vi.fn().mockResolvedValue(1);
    const tx = { $executeRaw: executeRaw };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<string>) => callback(tx)),
    };
    const work = vi.fn().mockResolvedValue("done");

    const result = await withPrismaWorkspace(
      prisma as never,
      {
        workspaceId: "00000000-0000-4000-8000-000000000001",
        userId: "user-1",
      },
      work as never,
    );

    expect(result).toBe("done");
    expect(executeRaw).toHaveBeenCalledTimes(3);
    expect(work).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed workspace ids before opening a transaction", async () => {
    const prisma = { $transaction: vi.fn() };

    await expect(
      withPrismaWorkspace(
        prisma as never,
        { workspaceId: "not-a-workspace" },
        vi.fn() as never,
      ),
    ).rejects.toThrow("Invalid workspace id");

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
