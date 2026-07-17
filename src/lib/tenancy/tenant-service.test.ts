import { describe, expect, it, vi } from "vitest";

import { executeTenantService } from "@/lib/tenancy/tenant-service";

describe("executeTenantService", () => {
  it("passes only the scoped transaction client to service code", async () => {
    const executeRaw = vi.fn().mockResolvedValue(1);
    const tx = { $executeRaw: executeRaw, product: { findMany: vi.fn().mockResolvedValue([]) } };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const run = vi.fn(async (client: typeof tx) => client.product.findMany());

    const result = await executeTenantService(prisma as never, {
      context: {
        workspaceId: "00000000-0000-4000-8000-000000000001",
        userId: "user-1",
        correlationId: "corr-1",
      },
      run: run as never,
    });

    expect(result).toEqual([]);
    expect(run).toHaveBeenCalledWith(tx);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(executeRaw).toHaveBeenCalledTimes(3);
  });
});
