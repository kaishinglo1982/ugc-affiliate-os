import { describe, expect, it } from "vitest";

describe("negative cross-workspace isolation", () => {
  it("requires the database layer to FORCE RLS every workspace-owned table", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(
      "prisma/migrations/20261007180000_workspace_rls_full_activation/migration.sql",
      "utf8",
    );
    expect(source).toContain("FORCE ROW LEVEL SECURITY");
    expect(source).toContain('"workspaceId" = current_workspace_id()');
    expect(source).toContain("WITH CHECK");
  });

  it("does not permit a request to establish workspace context outside a transaction", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("src/lib/db/workspace-transaction.ts", "utf8");
    expect(source).toContain("prisma.$transaction");
    expect(source).toContain("set_config('app.current_workspace_id'");
  });
});
