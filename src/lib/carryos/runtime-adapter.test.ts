import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const resolveCarryOSTenantContext = vi.fn();
const runAll = vi.fn();
const scoreProductOpportunities = vi.fn();
const findMany = vi.fn();

vi.mock("@/lib/auth/tenant", () => ({ resolveCarryOSTenantContext }));
vi.mock("@/features/products/application/research-job", () => ({ runAll }));
vi.mock("@/features/products/application/core", () => ({ scoreProductOpportunities }));
vi.mock("@/lib/db/client", () => ({ prisma: { productOpportunity: { findMany } } }));

describe("CarryOS runtime adapter", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("fails closed without a CarryOS tenant token", async () => {
    resolveCarryOSTenantContext.mockResolvedValue(null);
    const { executeCarryOSRuntime, CarryOSRuntimeAuthorizationError } =
      await import("./runtime-adapter");

    await expect(
      executeCarryOSRuntime({ operation: "affiliate.opportunity.list" }),
    ).rejects.toBeInstanceOf(CarryOSRuntimeAuthorizationError);
  });

  it("rejects a token without the workflow execution scope", async () => {
    resolveCarryOSTenantContext.mockResolvedValue({
      tenantId: "tenant-a",
      workspaceId: "workspace-a",
      scope: "wrong:scope",
      capabilities: ["ugc:opportunities:manage"],
    });
    const { executeCarryOSRuntime, CarryOSRuntimeAuthorizationError } =
      await import("./runtime-adapter");

    await expect(
      executeCarryOSRuntime({ operation: "affiliate.opportunity.list" }),
    ).rejects.toBeInstanceOf(CarryOSRuntimeAuthorizationError);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("rejects an operation without its declared capability", async () => {
    resolveCarryOSTenantContext.mockResolvedValue({
      tenantId: "tenant-a",
      workspaceId: "workspace-a",
      scope: "carryos:workflow:execute",
      capabilities: [],
    });
    const { executeCarryOSRuntime, CarryOSRuntimeAuthorizationError } =
      await import("./runtime-adapter");

    await expect(
      executeCarryOSRuntime({ operation: "affiliate.opportunity.score" }),
    ).rejects.toBeInstanceOf(CarryOSRuntimeAuthorizationError);
    expect(scoreProductOpportunities).not.toHaveBeenCalled();
  });

  it("never accepts a caller workspaceId and dispatches with the bound workspace", async () => {
    resolveCarryOSTenantContext.mockResolvedValue({
      tenantId: "tenant-a",
      workspaceId: "workspace-bound",
      scope: "carryos:workflow:execute",
      capabilities: ["ugc:opportunities:manage"],
    });
    findMany.mockResolvedValue([{ id: "opp-1", workspaceId: "workspace-bound" }]);
    const { executeCarryOSRuntime } = await import("./runtime-adapter");

    const result = await executeCarryOSRuntime({
      operation: "affiliate.opportunity.list",
      correlationId: "corr-1",
    });

    expect(findMany).toHaveBeenCalledWith({
      where: { workspaceId: "workspace-bound" },
      orderBy: { calculatedAt: "desc" },
    });
    expect(result.workspaceId).toBe("workspace-bound");
  });

  it("dispatches research only with the verified tenant workspace", async () => {
    resolveCarryOSTenantContext.mockResolvedValue({
      tenantId: "tenant-a",
      workspaceId: "workspace-bound",
      scope: "carryos:workflow:execute",
      capabilities: ["ugc:affiliate:research"],
    });
    runAll.mockResolvedValue({ status: "completed", steps: [] });
    const { executeCarryOSRuntime } = await import("./runtime-adapter");

    const result = await executeCarryOSRuntime({
      operation: "affiliate.research",
      correlationId: "corr-2",
    });

    expect(runAll).toHaveBeenCalledWith(
      "carryos:tenant-a",
      "corr-2",
      "workspace-bound",
    );
    expect(result.result).toEqual({ status: "completed", steps: [] });
  });
});
