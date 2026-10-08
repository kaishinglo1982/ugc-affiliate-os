import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/api/guard", () => ({ requireApiPermission: vi.fn() }));
vi.mock("@/lib/auth/tenant", () => ({ resolveWorkspaceId: vi.fn() }));
vi.mock("@/lib/auth/rbac", () => ({ Permission: { EXPORT_FINANCE: "finance.export" } }));

const expenseFindMany = vi.fn();
const revenueFindMany = vi.fn();
const productFindMany = vi.fn();
const withWorkspaceTransaction = vi.fn(async (_id: string, fn: (tx: unknown) => Promise<unknown>) =>
  fn({
    expense: { findMany: expenseFindMany },
    revenue: { findMany: revenueFindMany },
    product: { findMany: productFindMany },
  }),
);
vi.mock("@/lib/db/workspace-transaction", () => ({
  withWorkspaceTransaction: (id: string, fn: (tx: unknown) => Promise<unknown>) => withWorkspaceTransaction(id, fn),
}));

import { requireApiPermission } from "@/lib/api/guard";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { GET as financeExport } from "./route";
import { GET as productsExport } from "../../products/export/route";

const WORKSPACE = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveWorkspaceId).mockResolvedValue(WORKSPACE);
  expenseFindMany.mockResolvedValue([]);
  revenueFindMany.mockResolvedValue([]);
  productFindMany.mockResolvedValue([]);
});

describe("export routes tenant and permission guard", () => {
  it.each([
    ["finance revenue", () => financeExport(new Request("http://x/api/finance/export")), revenueFindMany],
    ["finance expense", () => financeExport(new Request("http://x/api/finance/export?type=expense")), expenseFindMany],
    ["products", () => productsExport(), productFindMany],
  ])("%s: returns the guard response and reads nothing when unauthorized", async (_name, call, findMany) => {
    vi.mocked(requireApiPermission).mockResolvedValue({
      response: NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 }),
    });
    const res = await call();
    expect(res.status).toBe(403);
    expect(findMany).not.toHaveBeenCalled();
    expect(withWorkspaceTransaction).not.toHaveBeenCalled();
  });

  it.each([
    ["finance revenue", () => financeExport(new Request("http://x/api/finance/export")), revenueFindMany],
    ["finance expense", () => financeExport(new Request("http://x/api/finance/export?type=expense")), expenseFindMany],
    ["products", () => productsExport(), productFindMany],
  ])("%s: scopes the query to the caller workspace", async (_name, call, findMany) => {
    vi.mocked(requireApiPermission).mockResolvedValue(null);
    const res = await call();
    expect(res.status).toBe(200);
    expect(withWorkspaceTransaction).toHaveBeenCalledWith(WORKSPACE, expect.any(Function));
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { workspaceId: WORKSPACE } }));
  });

  it("finance export requires finance.export", async () => {
    vi.mocked(requireApiPermission).mockResolvedValue(null);
    await financeExport(new Request("http://x/api/finance/export"));
    expect(requireApiPermission).toHaveBeenCalledWith("finance.export");
  });
});
