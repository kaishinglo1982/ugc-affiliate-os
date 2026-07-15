// Cross-tenant isolation proof (BAND-60 acceptance criterion). Real DB, no mocks:
// creates rows in two workspaces and asserts workspace-scoped queries never
// cross the boundary — the same query shape used by the converted routes
// (src/app/api/products/[id], src/app/app/intelligence/*).
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "./client";

const workspaceA = randomUUID();
const workspaceB = randomUUID();
let productA: { id: string };
let productB: { id: string };

beforeAll(async () => {
  productA = await prisma.product.create({
    data: { workspaceId: workspaceA, canonicalName: `A-${randomUUID()}` },
  });
  productB = await prisma.product.create({
    data: { workspaceId: workspaceB, canonicalName: `B-${randomUUID()}` },
  });
});

afterAll(async () => {
  await prisma.product.deleteMany({ where: { workspaceId: { in: [workspaceA, workspaceB] } } });
});

describe("tenant isolation (Product)", () => {
  it("a workspace-scoped findFirst by id never returns another workspace's row", async () => {
    const foundInOwnWorkspace = await prisma.product.findFirst({
      where: { id: productA.id, workspaceId: workspaceA },
    });
    expect(foundInOwnWorkspace?.id).toBe(productA.id);

    const crossTenantAttempt = await prisma.product.findFirst({
      where: { id: productA.id, workspaceId: workspaceB },
    });
    expect(crossTenantAttempt).toBeNull();
  });

  it("a workspace-scoped findMany only lists rows from that workspace", async () => {
    const listA = await prisma.product.findMany({ where: { workspaceId: workspaceA } });
    const listB = await prisma.product.findMany({ where: { workspaceId: workspaceB } });

    expect(listA.map((p) => p.id)).toContain(productA.id);
    expect(listA.map((p) => p.id)).not.toContain(productB.id);
    expect(listB.map((p) => p.id)).toContain(productB.id);
    expect(listB.map((p) => p.id)).not.toContain(productA.id);
  });

  it("an update filtered by the wrong workspace affects zero rows (fail-closed, not fail-open)", async () => {
    const result = await prisma.product.updateMany({
      where: { id: productA.id, workspaceId: workspaceB },
      data: { description: "should never apply" },
    });
    expect(result.count).toBe(0);

    const unchanged = await prisma.product.findUnique({ where: { id: productA.id } });
    expect(unchanged?.description).not.toBe("should never apply");
  });
});
