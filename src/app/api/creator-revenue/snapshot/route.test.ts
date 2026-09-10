import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { workflowFindManyMock } = vi.hoisted(() => ({
  workflowFindManyMock: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    workflowDefinition: {
      findMany: workflowFindManyMock,
    },
  },
}));

import { GET } from "./route";

const originalEnv = { ...process.env };
const token = "ugc-creator-revenue-service-token-1234567890abcdef";

function request(authToken = token): Request {
  return new Request("http://ugc.test/api/creator-revenue/snapshot", {
    headers: { authorization: `Bearer ${authToken}` },
  });
}

beforeEach(() => {
  process.env.UGC_SERVICE_TOKEN = token;
  workflowFindManyMock.mockReset();
  workflowFindManyMock.mockResolvedValue([
    {
      id: "workflow-1",
      name: "Real UGC Workflow",
      description: "Imported from authoritative UGC workflow data",
      status: "ACTIVE",
      config: {
        product: "Real Product",
        offer: "Real Offer",
        sourceUrl: "https://example.test/source",
        assetUrl: "https://example.test/asset",
        channel: "TikTok",
        creatorRevenueStage: "SCRIPT",
      },
      createdAt: new Date("2026-09-10T10:00:00.000Z"),
    },
    {
      id: "workflow-2",
      name: "Workflow Without Creator Mapping",
      description: null,
      status: "DRAFT",
      config: {},
      createdAt: new Date("2026-09-09T10:00:00.000Z"),
    },
  ]);
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Creator Revenue UGC snapshot", () => {
  it("requires the dedicated UGC service token", async () => {
    const response = await GET(request("wrong-token"));

    expect(response.status).toBe(401);
    expect(workflowFindManyMock).not.toHaveBeenCalled();
  });

  it("returns only persisted workflow facts and preserves unknown mappings as empty", async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    const payload = await response.json() as {
      ok: boolean;
      data: { workflows: Array<Record<string, unknown>> };
      workflows: Array<Record<string, unknown>>;
    };

    expect(payload.ok).toBe(true);
    expect(payload.workflows).toEqual(payload.data.workflows);
    expect(payload.workflows).toHaveLength(2);
    expect(payload.workflows[0]).toMatchObject({
      id: "workflow-1",
      name: "Real UGC Workflow",
      product: "Real Product",
      offer: "Real Offer",
      channel: "tiktok",
      stage: "SCRIPT",
      provenance: "UGC_AFFILIATE_OS",
    });
    expect(payload.workflows[1]).toMatchObject({
      id: "workflow-2",
      name: "Workflow Without Creator Mapping",
      product: "",
      offer: "",
      channel: "",
      stage: "",
      note: "",
      provenance: "UGC_AFFILIATE_OS",
    });
    expect(workflowFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
      where: { workspaceId: process.env.DEFAULT_WORKSPACE_ID ?? "00000000-0000-0000-0000-000000000001" },
      take: 250,
    }));
  });
});
