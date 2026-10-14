import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  resolveWorkspaceId: vi.fn(),
  revenueFindMany: vi.fn(),
  expenseFindMany: vi.fn(),
  productFindMany: vi.fn(),
  toCsv: vi.fn(() => "csv"),
}));

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/auth/tenant", () => ({
  InvalidTenantTokenError: class InvalidTenantTokenError extends Error {},
  resolveWorkspaceId: mocks.resolveWorkspaceId,
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
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
  mocks.getCurrentUser.mockResolvedValue({ id: "user-a" });
  mocks.resolveWorkspaceId.mockResolvedValue(WORKSPACE_A);
  mocks.revenueFindMany.mockResolvedValue([]);
  mocks.expenseFindMany.mockResolvedValue([]);
  mocks.productFindMany.mockResolvedValue([]);
});

describe("tenant-scoped CSV exports", () => {
  it("scopes revenue export to the server-resolved workspace", async () => {
    const response = await financeExport(new Request("http://localhost/api/finance/export"));

    expect(response.status).toBe(200);
    expect(mocks.revenueFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: WORKSPACE_A } }),
    );
    expect(mocks.expenseFindMany).not.toHaveBeenCalled();
  });

  it("scopes expense export to the server-resolved workspace", async () => {
    const response = await financeExport(new Request("http://localhost/api/finance/export?type=expense"));

    expect(response.status).toBe(200);
    expect(mocks.expenseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: WORKSPACE_A } }),
    );
    expect(mocks.revenueFindMany).not.toHaveBeenCalled();
  });

  it("scopes product export to the server-resolved workspace", async () => {
    const response = await productExport();

    expect(response.status).toBe(200);
    expect(mocks.productFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: WORKSPACE_A } }),
    );
  });

  it("rejects unauthenticated exports before reading tenant data", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const financeResponse = await financeExport(new Request("http://localhost/api/finance/export"));
    const productResponse = await productExport();

    expect(financeResponse.status).toBe(401);
    expect(productResponse.status).toBe(401);
    expect(mocks.resolveWorkspaceId).not.toHaveBeenCalled();
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
