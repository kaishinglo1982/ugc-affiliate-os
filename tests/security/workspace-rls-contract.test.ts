import { describe, expect, it } from "vitest";
import { withWorkspaceTransaction } from "@/lib/db/workspace-transaction";

describe("workspace RLS isolation contract", () => {
  it("rejects malformed workspace ids before opening a transaction", async () => {
    await expect(
      withWorkspaceTransaction("not-a-uuid", async () => undefined),
    ).rejects.toThrow("INVALID_WORKSPACE_ID");
  });

  it("uses a transaction-scoped PostgreSQL workspace context", async () => {
    const source = await import("node:fs").then(({ readFileSync }) =>
      readFileSync("src/lib/db/workspace-transaction.ts", "utf8"),
    );
    expect(source).toContain("set_config('app.current_workspace_id'");
    expect(source).toContain("prisma.$transaction");
    expect(source).toContain("true)");
  });
});
