import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const executeRaw = vi.fn().mockResolvedValue(1);
const transaction = vi.fn(async (fn: (tx: { $executeRaw: typeof executeRaw }) => Promise<unknown>) =>
  fn({ $executeRaw: executeRaw }),
);
vi.mock("@/lib/db/client", () => ({ prisma: { $transaction: transaction } }));
vi.mock("@/generated/prisma/client", () => ({ Prisma: {} }));

describe("withWorkspaceTransaction", () => {
  beforeEach(() => {
    executeRaw.mockClear();
    transaction.mockClear();
  });

  it("accepts the legacy default workspace id", async () => {
    const { withWorkspaceTransaction } = await import("./workspace-transaction");
    await expect(
      withWorkspaceTransaction("00000000-0000-0000-0000-000000000001", async () => "ok"),
    ).resolves.toBe("ok");
    expect(executeRaw).toHaveBeenCalledTimes(1);
  });

  it("accepts RFC 4122 workspace ids", async () => {
    const { withWorkspaceTransaction } = await import("./workspace-transaction");
    await expect(
      withWorkspaceTransaction("11111111-1111-4111-8111-111111111111", async () => "ok"),
    ).resolves.toBe("ok");
  });

  it.each(["", "default", "1111", "11111111-1111-4111-8111-11111111111g", "x'; drop table--"])(
    "rejects malformed workspace id %j before touching the database",
    async (id) => {
      const { withWorkspaceTransaction } = await import("./workspace-transaction");
      await expect(withWorkspaceTransaction(id, async () => "ok")).rejects.toThrow("INVALID_WORKSPACE_ID");
      expect(transaction).not.toHaveBeenCalled();
    },
  );
});
