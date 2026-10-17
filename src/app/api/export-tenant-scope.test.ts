import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  resolveWorkspaceId: vi.fn(),
  setWorkspace: vi.fn(),
  transaction: vi.fn(),
  revenueFindMany: vi.fn(),
  expenseFindMany: vi.fn(),
  productFindMany: vi.fn(),
  toCsv: vi.fn(() => "csv"),
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

vi.mock("@/lib/db/client", () => ({
  prisma: {
    $transaction: mocks.transaction,
    revenue: { findMany: mocks.revenueFindMany },
    expense: { findMany: mocks.expenseFindMany },
    product: { findMany: mocks.productFindMany },
  },
}));

vi.mock("@/lib/csv", () => ({
  toCsv: mocks.toCsv,
}));

import { GET as financeExport } from "@/app/api/finance/export/route";
import { GET as productExport } from "@/app/api/products/export/route";
import { InvalidTenantTokenError } from "@/lib/auth/tenant";

const WORKSPACE_A = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiPermission.mockResolvedValue(null);
  mocks.resolveWorkspaceId.mockResolvedValue(WORKSPACE_A);
  mocks.setWorkspace.mockResolvedValue([]);
  mocks.revenueFindMany.mockResolvedValue([]);
  mocks.expenseFindMany.mockResolvedValue([]);
  mocks.productFindMany.mockResolvedValue([]);
  mocks.transaction.mockImplementation(async (operation: (tx: unknown) => Promise<unknown>) =>
    operation({
      $executeRaw: mocks.setWorkspace,
      revenue: { findMany: mocks.revenueFindMany },
      expense: { findMany: mocks.expenseFindMany },
      product: { findMany: mocks.productFindMany },
    }),
  );
});

describe("tenant-scoped CSV exports", () => {
  it("scopes revenue export and binds the same transaction to the resolved workspace", async () => {
    const response = await financeExport(new Request("http://localhost/api/finance/export"));

    expect(response.status).toBe(200);
    expect(mocks.requireApiPermission).toHaveBeenCalledWith("finance.export");
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.setWorkspace).toHaveBeenCalledWith(
      ["select set_config('app.current_workspace_id', ", ", true)"],
      WORKSPACE_A,
    );
    expect(mocks.revenueFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: WORKSPACE_A } }),
    );
    expect(mocks.expenseFindMany).not.toHaveBeenCalled();
  });

  it("scopes expense export to the server-resolved workspace", async () => {
    const response = await financeExport(
      new Request("http://localhost/api/finance/export?type=expense"),
    );

    expect(response.status).toBe(200);
    expect(mocks.expenseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: WORKSPACE_A } }),
    );
    expect(mocks.revenueFindMany).not.toHaveBeenCalled();
  });

  it("scopes product export and requires the product-read permission", async () => {
    const response = await productExport();

    expect(response.status).toBe(200);
    expect(mocks.requireApiPermission).toHaveBeenCalledWith("products.read");
    expect(mocks.productFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: WORKSPACE_A } }),
    );
  });

  it("rejects permission-denied exports before resolving or reading tenant data", async () => {
    const forbidden = new Response("forbidden", { status: 403 });
    mocks.requireApiPermission.mockResolvedValue({ response: forbidden });

    const financeResponse = await financeExport(new Request("http://localhost/api/finance/export"));
    const productResponse = await productExport();

    expect(financeResponse).toBe(forbidden);
    expect(productResponse).toBe(forbidden);
    expect(mocks.resolveWorkspaceId).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.revenueFindMany).not.toHaveBeenCalled();
    expect(mocks.expenseFindMany).not.toHaveBeenCalled();
    expect(mocks.productFindMany).not.toHaveBeenCalled();
  });

  it("fails closed when the CarryOS tenant assertion is invalid", async () => {
    mocks.resolveWorkspaceId.mockRejectedValue(new InvalidTenantTokenError("invalid tenant token"));

    const financeResponse = await financeExport(new Request("http://localhost/api/finance/export"));
    const productResponse = await productExport();

    expect(financeResponse.status).toBe(401);
    expect(productResponse.status).toBe(401);
    expect(mocks.revenueFindMany).not.toHaveBeenCalled();
    expect(mocks.expenseFindMany).not.toHaveBeenCalled();
    expect(mocks.productFindMany).not.toHaveBeenCalled();
  });
});
