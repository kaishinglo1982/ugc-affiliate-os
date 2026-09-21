import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyMock, executeRawMock, transactionMock, resolveWorkspaceIdMock } = vi.hoisted(() => {
  const findMany = vi.fn().mockResolvedValue([{ id: "p1" }]);
  const executeRaw = vi.fn().mockResolvedValue(1);
  const transaction = vi.fn(
    async (
      callback: (tx: {
        $executeRaw: typeof executeRaw;
        product: { findMany: typeof findMany };
      }) => Promise<unknown>,
    ) =>
      callback({
        $executeRaw: executeRaw,
        product: { findMany },
      }),
  );
  const resolveWorkspaceId = vi.fn().mockResolvedValue("11111111-1111-4111-8111-111111111111");

  return {
    findManyMock: findMany,
    executeRawMock: executeRaw,
    transactionMock: transaction,
    resolveWorkspaceIdMock: resolveWorkspaceId,
  };
});

vi.mock("@/lib/auth/tenant", () => ({
  resolveWorkspaceId: resolveWorkspaceIdMock,
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    $transaction: transactionMock,
    product: { findMany: findManyMock },
  },
}));

import { tenantPrisma } from "@/lib/db/tenant-client";

describe("tenantPrisma", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("binds app.workspace_id before a legacy model operation", async () => {
    const result = await tenantPrisma.product.findMany({ where: { status: "ACTIVE" } });

    expect(resolveWorkspaceIdMock).toHaveBeenCalledOnce();
    expect(transactionMock).toHaveBeenCalledOnce();
    expect(executeRawMock).toHaveBeenCalledOnce();
    expect(findManyMock).toHaveBeenCalledWith({ where: { status: "ACTIVE" } });
    expect(result).toEqual([{ id: "p1" }]);
  });

  it("forbids raw/client operations that require an explicit workspace transaction", () => {
    expect(() => tenantPrisma.$queryRaw).toThrow(
      "TENANT_PRISMA_CLIENT_OPERATION_FORBIDDEN",
    );
  });
});
