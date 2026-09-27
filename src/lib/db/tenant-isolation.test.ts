// Cross-tenant isolation proof (BAND-60 acceptance criterion). Real DB, no mocks:
// creates rows in two workspaces and asserts workspace-scoped queries never
// cross the boundary — the same query shape used by the converted routes
// (src/app/api/products/[id], src/app/app/intelligence/*).
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "./client";
import { withWorkspaceTransaction } from "./workspace-transaction";

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


describe("tenant isolation (MediaAsset + AffiliateLink)", () => {
  let mediaA: { id: string };
  let linkA: { id: string };

  beforeAll(async () => {
    mediaA = await prisma.mediaAsset.create({
      data: {
        workspaceId: workspaceA,
        kind: "IMAGE",
        fileName: "tenant-a.png",
        storageKey: `tenant-test/${randomUUID()}.png`,
        url: "https://example.invalid/tenant-a.png",
        mimeType: "image/png",
        sizeBytes: 1,
      },
    });

    const programA = await prisma.affiliateProgram.create({
      data: { workspaceId: workspaceA, provider: "AMAZON_ASSOCIATES" },
    });
    linkA = await prisma.affiliateLink.create({
      data: {
        workspaceId: workspaceA,
        programId: programA.id,
        label: "Tenant A",
        destinationUrl: "https://example.invalid/a",
        shortSlug: `tenant-a-${randomUUID()}`,
      },
    });
  });

  afterAll(async () => {
    await prisma.affiliateLink.deleteMany({ where: { id: linkA.id } });
    await prisma.mediaAsset.deleteMany({ where: { id: mediaA.id } });
    await prisma.affiliateProgram.deleteMany({ where: { workspaceId: workspaceA } });
  });

  it("blocks cross-workspace media lookup and update", async () => {
    const foreign = await prisma.mediaAsset.findFirst({
      where: { id: mediaA.id, workspaceId: workspaceB },
    });
    const result = await prisma.mediaAsset.updateMany({
      where: { id: mediaA.id, workspaceId: workspaceB },
      data: { fileName: "cross-tenant-write.png" },
    });

    expect(foreign).toBeNull();
    expect(result.count).toBe(0);
  });

  it("blocks cross-workspace affiliate-link lookup and update", async () => {
    const foreign = await prisma.affiliateLink.findFirst({
      where: { id: linkA.id, workspaceId: workspaceB },
    });
    const result = await prisma.affiliateLink.updateMany({
      where: { id: linkA.id, workspaceId: workspaceB },
      data: { label: "cross-tenant-write" },
    });

    expect(foreign).toBeNull();
    expect(result.count).toBe(0);
  });
});

describe("tenant isolation (Campaign + SocialPost)", () => {
  let campaignA: { id: string };
  let campaignB: { id: string };
  let accountA: { id: string };
  let accountB: { id: string };
  let postA: { id: string };

  beforeAll(async () => {
    campaignA = await prisma.campaign.create({
      data: { workspaceId: workspaceA, name: `Campaign-A-${randomUUID()}` },
    });
    campaignB = await prisma.campaign.create({
      data: { workspaceId: workspaceB, name: `Campaign-B-${randomUUID()}` },
    });
    accountA = await prisma.socialAccount.create({
      data: { workspaceId: workspaceA, platform: "TIKTOK", handle: `@tenant-a-${randomUUID()}` },
    });
    accountB = await prisma.socialAccount.create({
      data: { workspaceId: workspaceB, platform: "TIKTOK", handle: `@tenant-b-${randomUUID()}` },
    });
    postA = await prisma.socialPost.create({
      data: {
        workspaceId: workspaceA,
        accountId: accountA.id,
        campaignId: campaignA.id,
        caption: "Tenant A post",
      },
    });
  });

  afterAll(async () => {
    await prisma.socialPost.deleteMany({ where: { id: postA.id } });
    await prisma.socialAccount.deleteMany({ where: { id: { in: [accountA.id, accountB.id] } } });
    await prisma.campaign.deleteMany({ where: { id: { in: [campaignA.id, campaignB.id] } } });
  });

  it("blocks cross-workspace campaign lookup and update", async () => {
    const foreign = await prisma.campaign.findFirst({
      where: { id: campaignA.id, workspaceId: workspaceB },
    });
    const result = await prisma.campaign.updateMany({
      where: { id: campaignA.id, workspaceId: workspaceB },
      data: { name: "cross-tenant-write" },
    });

    expect(foreign).toBeNull();
    expect(result.count).toBe(0);
  });

  it("blocks cross-workspace social-post lookup and update", async () => {
    const foreign = await prisma.socialPost.findFirst({
      where: { id: postA.id, workspaceId: workspaceB },
    });
    const result = await prisma.socialPost.updateMany({
      where: { id: postA.id, workspaceId: workspaceB },
      data: { caption: "cross-tenant-write" },
    });

    expect(foreign).toBeNull();
    expect(result.count).toBe(0);
  });

  it("does not expose a workspace-A post through workspace-B account ownership", async () => {
    const posts = await prisma.socialPost.findMany({
      where: { workspaceId: workspaceB, accountId: accountB.id },
    });
    expect(posts.map((post) => post.id)).not.toContain(postA.id);
  });
});

describe("tenant isolation (Agent + AgentRun)", () => {
  let agentA: { id: string };
  let agentB: { id: string };
  let runA: { id: string };

  beforeAll(async () => {
    agentA = await prisma.agent.create({
      data: {
        workspaceId: workspaceA,
        key: `tenant-a-${randomUUID()}`,
        name: "Tenant A Agent",
        role: "test",
        description: "Tenant isolation test agent",
      },
    });
    agentB = await prisma.agent.create({
      data: {
        workspaceId: workspaceB,
        key: `tenant-b-${randomUUID()}`,
        name: "Tenant B Agent",
        role: "test",
        description: "Tenant isolation test agent",
      },
    });
    runA = await prisma.agentRun.create({
      data: { workspaceId: workspaceA, agentId: agentA.id, status: "RUNNING" },
    });
  });

  afterAll(async () => {
    await prisma.agentRun.deleteMany({ where: { id: runA.id } });
    await prisma.agent.deleteMany({ where: { id: { in: [agentA.id, agentB.id] } } });
  });

  it("blocks cross-workspace agent and agent-run lookups", async () => {
    const foreignAgent = await prisma.agent.findFirst({
      where: { id: agentA.id, workspaceId: workspaceB },
    });
    const foreignRun = await prisma.agentRun.findFirst({
      where: { id: runA.id, workspaceId: workspaceB },
    });

    expect(foreignAgent).toBeNull();
    expect(foreignRun).toBeNull();
  });

  it("blocks cross-workspace agent and agent-run updates", async () => {
    const agentResult = await prisma.agent.updateMany({
      where: { id: agentA.id, workspaceId: workspaceB },
      data: { name: "cross-tenant-write" },
    });
    const runResult = await prisma.agentRun.updateMany({
      where: { id: runA.id, workspaceId: workspaceB },
      data: { summary: "cross-tenant-write" },
    });

    expect(agentResult.count).toBe(0);
    expect(runResult.count).toBe(0);
  });
});

describe("tenant isolation (WorkflowDefinition + WorkflowRun)", () => {
  let workflowA: { id: string };
  let workflowB: { id: string };
  let runA: { id: string };

  beforeAll(async () => {
    workflowA = await prisma.workflowDefinition.create({
      data: { workspaceId: workspaceA, key: `workflow-a-${randomUUID()}`, name: `Workflow-A-${randomUUID()}`, description: "Tenant isolation workflow" },
    });
    workflowB = await prisma.workflowDefinition.create({
      data: { workspaceId: workspaceB, key: `workflow-b-${randomUUID()}`, name: `Workflow-B-${randomUUID()}`, description: "Tenant isolation workflow" },
    });
    runA = await prisma.workflowRun.create({
      data: { workspaceId: workspaceA, workflowId: workflowA.id, status: "RUNNING", definitionSnapshot: {}, correlationId: randomUUID() },
    });
  });

  afterAll(async () => {
    await prisma.workflowRun.deleteMany({ where: { id: runA.id } });
    await prisma.workflowDefinition.deleteMany({
      where: { id: { in: [workflowA.id, workflowB.id] } },
    });
  });

  it("blocks cross-workspace workflow and workflow-run lookups", async () => {
    const foreignWorkflow = await prisma.workflowDefinition.findFirst({
      where: { id: workflowA.id, workspaceId: workspaceB },
    });
    const foreignRun = await prisma.workflowRun.findFirst({
      where: { id: runA.id, workspaceId: workspaceB },
    });

    expect(foreignWorkflow).toBeNull();
    expect(foreignRun).toBeNull();
  });

  it("blocks cross-workspace workflow and workflow-run updates", async () => {
    const workflowResult = await prisma.workflowDefinition.updateMany({
      where: { id: workflowA.id, workspaceId: workspaceB },
      data: { name: "cross-tenant-write" },
    });
    const runResult = await prisma.workflowRun.updateMany({
      where: { id: runA.id, workspaceId: workspaceB },
      data: { triggeredBy: "cross-tenant-write" },
    });

    expect(workflowResult.count).toBe(0);
    expect(runResult.count).toBe(0);
  });
});


describe("RLS enforcement (Product canary)", () => {
  const role = "ugc_rls_test_role";

  it("enforces the workspace policy for a non-owner database role", async () => {
    const roleExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      select exists(select 1 from pg_roles where rolname = 'ugc_rls_test_role') as exists
    `;
    if (!roleExists[0]?.exists) {
      await prisma.$executeRawUnsafe(`CREATE ROLE ugc_rls_test_role`);
    }
    await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO ugc_rls_test_role`);
    await prisma.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Product" TO ugc_rls_test_role`);

    try {
      const own = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE ugc_rls_test_role`);
        await tx.$executeRaw`select set_config('app.current_workspace_id', ${workspaceA}, true)`;

        const visible = await tx.$queryRaw<Array<{ id: string; workspace_id: string }>>`
          select "id", "workspaceId" as workspace_id
          from "Product"
          where "id" in (${productA.id}, ${productB.id})
          order by "id"
        `;

        const crossUpdate = await tx.$executeRaw`
          update "Product"
          set "description" = 'cross-tenant-rds-test'
          where "id" = ${productB.id}
        `;

        return { visible, crossUpdate };
      });

      expect(own.visible.map((row) => row.id)).toEqual([productA.id]);
      expect(own.visible[0]?.workspace_id).toBe(workspaceA);
      expect(own.crossUpdate).toBe(0);

      await expect(
        prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(`SET LOCAL ROLE ugc_rls_test_role`);
          await tx.$executeRaw`select set_config('app.current_workspace_id', ${workspaceA}, true)`;
          await tx.$executeRaw`
            insert into "Product" ("id", "workspaceId", "canonicalName")
            values (${randomUUID()}, ${workspaceB}, 'rls-cross-tenant-insert')
          `;
        }),
      ).rejects.toThrow();
    } finally {
      await prisma.$executeRawUnsafe(`REVOKE ALL ON TABLE "Product" FROM ugc_rls_test_role`);
      await prisma.$executeRawUnsafe(`DROP ROLE IF EXISTS ugc_rls_test_role`);
    }
  });
});

describe("workspace transaction context", () => {
  it("binds the workspace setting only for the transaction", async () => {
    const contextA = await withWorkspaceTransaction(workspaceA, async (tx) => {
      const result = await tx.$queryRaw<Array<{ workspace_id: string | null }>>`
        select current_setting('app.current_workspace_id', true) as workspace_id
      `;
      return result[0]?.workspace_id ?? null;
    });

    expect(contextA).toBe(workspaceA);

    const outsideContext = await prisma.$queryRaw<Array<{ workspace_id: string | null }>>`
      select current_setting('app.current_workspace_id', true) as workspace_id
    `;
    expect(outsideContext[0]?.workspace_id ?? '').toBe('');

    const contextB = await withWorkspaceTransaction(workspaceB, async (tx) => {
      const result = await tx.$queryRaw<Array<{ workspace_id: string | null }>>`
        select current_setting('app.current_workspace_id', true) as workspace_id
      `;
      return result[0]?.workspace_id ?? null;
    });

    expect(contextB).toBe(workspaceB);
  });

  it("rejects malformed workspace ids before opening a transaction", async () => {
    await expect(
      withWorkspaceTransaction("not-a-uuid", async () => "unreachable"),
    ).rejects.toThrow("INVALID_WORKSPACE_ID");
  });
});
