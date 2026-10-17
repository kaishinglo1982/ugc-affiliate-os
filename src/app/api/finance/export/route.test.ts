import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  resolveWorkspaceId: vi.fn(),
  revenueFindMany: vi.fn(),
  expenseFindMany: vi.fn(),
  productFindMany: vi.fn(),
  toCsv: vi.fn(() => "csv"),
  workspaceId: "",
}));

vi.mock("@/lib/api/guard", () => ({
  requireApiPermission: mocks.requireApiPermission,
}));

vi.mock("@/lib/auth/rbac", () => ({
  Permission: {
    EXPORT_FINANCE: "finance.export",
    VIEW_PRODUCTS: "products.read",
  },
}));

vi.mock("@/lib/auth/tenant", () => ({
  InvalidTenantTokenError: class InvalidTenantTokenError extends Error {},
  resolveWorkspaceId: mocks.resolveWorkspaceId,
}));

vi.mock("@/lib/db/workspace-transaction", () => ({
  withWorkspaceTransaction: async (
    workspaceId: string,
    operation: (tx: unknown) => Promise<unknown>,
  ) => {
    mocks.workspaceId = workspaceId;
    return operation({
      revenue: { findMany: mocks.revenueFindMany },
      expense: { findMany: mocks.expenseFindMany },
      product: { findMany: mocks.productFindMany },
    });
  },
}));

vi.mock("@/lib/csv", () => ({
  toCsv: mocks.toCsv,
}));

import { GET as financeExport } from "@/app/api/finance/export/route";
import { GET as productExport } from "@/app/api/products/export/route";

const WORKSPACE_A = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiPermission.mockResolvedValue(null);
  mocks.resolveWorkspaceId.mockResolvedValue(WORKSPACE_A);
  mocks.revenueFindMany.mockResolvedValue([]);
  mocks.expenseFindMany.mockResolvedValue([]);
  mocks.productFindMany.mockResolvedValue([]);
});

describe("authorized workspace-scoped exports", () => {
  it("denies finance export before any database read when permission is missing", async () => {
    const forbidden = new Response("forbidden", { status: 403 });
    mocks.requireApiPermission.mockResolvedValue({ response: forbidden });

    const response = await financeExport(new Request("http://localhost/api/finance/export"));

    expect(response).toBe(forbidden);
    expect(mocks.requireApiPermission).toHaveBeenCalledWith("finance.export");
    expect(mocks.revenueFindMany).not.toHaveBeenCalled();
    expect(mocks.expenseFindMany).not.toHaveBeenCalled();
  });

  it("binds finance export reads to the resolved workspace transaction", async () => {
    const response = await financeExport(new Request("http://localhost/api/finance/export"));

    expect(response.status).toBe(200);
    expect(mocks.workspaceId).toBe(WORKSPACE_A);
    expect(mocks.requireApiPermission).toHaveBeenCalledWith("finance.export");
    expect(mocks.revenueFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: WORKSPACE_A } }),
    );
    expect(mocks.expenseFindMany).not.toHaveBeenCalled();
  });

  it("requires product-read permission and binds product export to workspace", async () => {
    const response = await productExport();

    expect(response.status).toBe(200);
    expect(mocks.workspaceId).toBe(WORKSPACE_A);
    expect(mocks.requireApiPermission).toHaveBeenCalledWith("products.read");
    expect(mocks.productFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: WORKSPACE_A } }),
    );
  });
});
