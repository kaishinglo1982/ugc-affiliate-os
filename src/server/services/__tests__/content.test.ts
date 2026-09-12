import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({
  prisma: {
    campaign: { findFirst: vi.fn() },
    contentBrief: {
      create: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    contentHook: {
      create: vi.fn(),
      count: vi.fn(),
    },
    script: { count: vi.fn() },
    mediaAsset: { count: vi.fn() },
  },
}));

import { prisma } from "@/lib/db/client";
import {
  contentOverview,
  createContentBrief,
  createContentHook,
} from "@/server/services/content";

const campaignMock = prisma.campaign as unknown as {
  findFirst: ReturnType<typeof vi.fn>;
};
const briefMock = prisma.contentBrief as unknown as {
  create: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  groupBy: ReturnType<typeof vi.fn>;
};
const hookMock = prisma.contentHook as unknown as {
  create: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
};
const scriptMock = prisma.script as unknown as {
  count: ReturnType<typeof vi.fn>;
};
const assetMock = prisma.mediaAsset as unknown as {
  count: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("content service tenant isolation", () => {
  it("rejects a campaign outside the workspace", async () => {
    campaignMock.findFirst.mockResolvedValueOnce(null);

    await expect(
      createContentBrief("ws-1", {
        campaignId: "campaign-other",
        objective: "Test",
        createdBy: "user-1",
      }),
    ).rejects.toThrow("CAMPAIGN_NOT_FOUND");

    expect(briefMock.create).not.toHaveBeenCalled();
  });

  it("creates a brief with the resolved workspace and actor", async () => {
    campaignMock.findFirst.mockResolvedValueOnce({ id: "campaign-1" });
    briefMock.create.mockResolvedValueOnce({ id: "brief-1" });

    await createContentBrief("ws-1", {
      campaignId: "campaign-1",
      objective: "Conversion",
      createdBy: "user-1",
    });

    expect(briefMock.create).toHaveBeenCalledWith({
      data: {
        workspaceId: "ws-1",
        campaignId: "campaign-1",
        objective: "Conversion",
        createdBy: "user-1",
      },
    });
  });

  it("rejects a hook for a brief outside the workspace", async () => {
    briefMock.findFirst.mockResolvedValueOnce(null);

    await expect(
      createContentHook("ws-1", {
        briefId: "brief-other",
        angle: "Problem-Solution",
      }),
    ).rejects.toThrow("CONTENT_BRIEF_NOT_FOUND");

    expect(hookMock.create).not.toHaveBeenCalled();
  });

  it("scopes all overview aggregates to the workspace", async () => {
    briefMock.count.mockResolvedValueOnce(1);
    hookMock.count.mockResolvedValueOnce(2);
    scriptMock.count.mockResolvedValueOnce(3);
    assetMock.count.mockResolvedValueOnce(4);
    briefMock.findMany.mockResolvedValueOnce([]);
    briefMock.groupBy.mockResolvedValueOnce([]);

    await contentOverview("ws-1");

    expect(briefMock.count).toHaveBeenCalledWith({ where: { workspaceId: "ws-1" } });
    expect(hookMock.count).toHaveBeenCalledWith({ where: { workspaceId: "ws-1" } });
    expect(scriptMock.count).toHaveBeenCalledWith({ where: { workspaceId: "ws-1" } });
    expect(assetMock.count).toHaveBeenCalledWith({ where: { workspaceId: "ws-1" } });
  });
});
