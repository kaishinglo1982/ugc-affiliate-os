import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, txMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
  },
  txMock: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock("./client", () => ({ prisma: prismaMock }));

import { withWorkspaceTransaction } from "./with-workspace-transaction";

describe("withWorkspaceTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txMock.$queryRaw.mockResolvedValue([{ current_workspace_id: "workspace-a" }]);
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock),
    );
  });

  it("rejects a missing workspace before opening a transaction", async () => {
    await expect(withWorkspaceTransaction("  ", async () => "unused")).rejects.toThrow(
      "WORKSPACE_CONTEXT_REQUIRED",
    );
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects whitespace-padded workspace IDs", async () => {
    await expect(withWorkspaceTransaction(" workspace-a ", async () => "unused")).rejects.toThrow(
      "WORKSPACE_CONTEXT_INVALID",
    );
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("sets the workspace context inside the transaction before running work", async () => {
    const work = vi.fn(async () => "ok");

    await expect(withWorkspaceTransaction("workspace-a", work)).resolves.toBe("ok");

    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(txMock.$queryRaw).toHaveBeenCalledOnce();
    expect(work).toHaveBeenCalledOnce();
  });

  it("fails closed if PostgreSQL does not confirm the requested context", async () => {
    txMock.$queryRaw.mockResolvedValueOnce([{ current_workspace_id: "workspace-b" }]);
    const work = vi.fn(async () => "must-not-run");

    await expect(withWorkspaceTransaction("workspace-a", work)).rejects.toThrow(
      "WORKSPACE_CONTEXT_NOT_ESTABLISHED",
    );
    expect(work).not.toHaveBeenCalled();
  });
});
