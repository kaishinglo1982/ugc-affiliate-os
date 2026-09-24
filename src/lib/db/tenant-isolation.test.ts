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


describe("tenant isolation (Notification)", () => {
  let notificationA: { id: string };
  let notificationB: { id: string };

  beforeAll(async () => {
    notificationA = await prisma.notification.create({
      data: { workspaceId: workspaceA, title: "A", message: "workspace A" },
    });
    notificationB = await prisma.notification.create({
      data: { workspaceId: workspaceB, title: "B", message: "workspace B" },
    });
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({
      where: { id: { in: [notificationA.id, notificationB.id] } },
    });
  });

  it("cannot read another workspace notification through a scoped lookup", async () => {
    const own = await prisma.notification.findFirst({
      where: { id: notificationA.id, workspaceId: workspaceA },
    });
    const foreign = await prisma.notification.findFirst({
      where: { id: notificationA.id, workspaceId: workspaceB },
    });

    expect(own?.id).toBe(notificationA.id);
    expect(foreign).toBeNull();
  });

  it("cannot update another workspace notification", async () => {
    const result = await prisma.notification.updateMany({
      where: { id: notificationA.id, workspaceId: workspaceB },
      data: { readAt: new Date() },
    });

    expect(result.count).toBe(0);
    const unchanged = await prisma.notification.findUnique({ where: { id: notificationA.id } });
    expect(unchanged?.readAt).toBeNull();
    expect(notificationB.id).not.toBe(notificationA.id);
  });
});

describe("tenant isolation (AnalyticsEvent)", () => {
  let eventA: { id: string };
  let eventB: { id: string };

  beforeAll(async () => {
    eventA = await prisma.analyticsEvent.create({
      data: {
        workspaceId: workspaceA,
        eventType: "VIEW",
        source: "INTERNAL",
        idempotencyKey: `tenant-test-a-${randomUUID()}`,
        occurredAt: new Date(),
      },
    });
    eventB = await prisma.analyticsEvent.create({
      data: {
        workspaceId: workspaceB,
        eventType: "VIEW",
        source: "INTERNAL",
        idempotencyKey: `tenant-test-b-${randomUUID()}`,
        occurredAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    await prisma.analyticsEvent.deleteMany({
      where: { id: { in: [eventA.id, eventB.id] } },
    });
  });

  it("cannot read another workspace event through a scoped lookup", async () => {
    const own = await prisma.analyticsEvent.findFirst({
      where: { id: eventA.id, workspaceId: workspaceA },
    });
    const foreign = await prisma.analyticsEvent.findFirst({
      where: { id: eventA.id, workspaceId: workspaceB },
    });

    expect(own?.id).toBe(eventA.id);
    expect(foreign).toBeNull();
  });

  it("cannot update another workspace event", async () => {
    const result = await prisma.analyticsEvent.updateMany({
      where: { id: eventA.id, workspaceId: workspaceB },
      data: { metadataReferenceId: "cross-tenant-write" },
    });

    expect(result.count).toBe(0);
    const unchanged = await prisma.analyticsEvent.findUnique({ where: { id: eventA.id } });
    expect(unchanged?.metadataReferenceId).not.toBe("cross-tenant-write");
  });
});


describe("tenant isolation (Script + VideoJob)", () => {
  let scriptA: { id: string };
  let scriptB: { id: string };
  let videoA: { id: string };

  beforeAll(async () => {
    scriptA = await prisma.script.create({
      data: { workspaceId: workspaceA, title: `Script-A-${randomUUID()}` },
    });
    scriptB = await prisma.script.create({
      data: { workspaceId: workspaceB, title: `Script-B-${randomUUID()}` },
    });
    videoA = await prisma.videoJob.create({
      data: {
        workspaceId: workspaceA,
        scriptId: scriptA.id,
        format: "UGC",
        aspectRatio: "9:16",
        durationSec: 30,
      },
    });
  });

  afterAll(async () => {
    await prisma.videoJob.deleteMany({ where: { id: videoA.id } });
    await prisma.script.deleteMany({ where: { id: { in: [scriptA.id, scriptB.id] } } });
  });

  it("blocks cross-workspace script lookup", async () => {
    const own = await prisma.script.findFirst({
      where: { id: scriptA.id, workspaceId: workspaceA },
    });
    const foreign = await prisma.script.findFirst({
      where: { id: scriptA.id, workspaceId: workspaceB },
    });
    expect(own?.id).toBe(scriptA.id);
    expect(foreign).toBeNull();
  });

  it("blocks cross-workspace video lookup", async () => {
    const own = await prisma.videoJob.findFirst({
      where: { id: videoA.id, workspaceId: workspaceA },
    });
    const foreign = await prisma.videoJob.findFirst({
      where: { id: videoA.id, workspaceId: workspaceB },
    });
    expect(own?.id).toBe(videoA.id);
    expect(foreign).toBeNull();
  });

  it("cross-workspace updates affect zero rows", async () => {
    const scriptResult = await prisma.script.updateMany({
      where: { id: scriptA.id, workspaceId: workspaceB },
      data: { title: "cross-tenant-write" },
    });
    const videoResult = await prisma.videoJob.updateMany({
      where: { id: videoA.id, workspaceId: workspaceB },
      data: { progress: 99 },
    });

    expect(scriptResult.count).toBe(0);
    expect(videoResult.count).toBe(0);

    const script = await prisma.script.findUnique({ where: { id: scriptA.id } });
    const video = await prisma.videoJob.findUnique({ where: { id: videoA.id } });
    expect(script?.title).not.toBe("cross-tenant-write");
    expect(video?.progress).toBe(0);
  });
});
