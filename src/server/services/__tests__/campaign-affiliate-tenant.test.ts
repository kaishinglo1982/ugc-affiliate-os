import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({
  prisma: {
    campaign: { findMany: vi.fn(), findFirst: vi.fn() },
    affiliateProgram: { findMany: vi.fn() },
    affiliateLink: { findMany: vi.fn() },
    product: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/db/client";
import { listCampaigns, getCampaignById } from "@/server/services/campaigns";
import {
  listAffiliateLinks,
  listAffiliatePrograms,
  listProductsForSelect,
} from "@/server/services/affiliate";

const campaignMock = prisma.campaign as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
};
const programMock = prisma.affiliateProgram as unknown as {
  findMany: ReturnType<typeof vi.fn>;
};
const linkMock = prisma.affiliateLink as unknown as {
  findMany: ReturnType<typeof vi.fn>;
};
const productMock = prisma.product as unknown as {
  findMany: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("campaign and affiliate tenant isolation", () => {
  it("scopes campaign lists and filters to one workspace", async () => {
    campaignMock.findMany.mockResolvedValueOnce([]);

    await listCampaigns("ws-1", {
      status: "ACTIVE",
      productId: "product-1",
    });

    expect(campaignMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          workspaceId: "ws-1",
          status: "ACTIVE",
          productId: "product-1",
        },
      }),
    );
  });

  it("scopes campaign details and child collections", async () => {
    campaignMock.findFirst.mockResolvedValueOnce(null);

    await getCampaignById("campaign-1", "ws-1");

    expect(campaignMock.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "campaign-1", workspaceId: "ws-1" },
        include: expect.objectContaining({
          scripts: expect.objectContaining({ where: { workspaceId: "ws-1" } }),
          videoJobs: expect.objectContaining({ where: { workspaceId: "ws-1" } }),
          revenues: expect.objectContaining({ where: { workspaceId: "ws-1" } }),
          expenses: expect.objectContaining({ where: { workspaceId: "ws-1" } }),
        }),
      }),
    );
  });

  it("scopes affiliate programs to one workspace", async () => {
    programMock.findMany.mockResolvedValueOnce([]);

    await listAffiliatePrograms("ws-1", {
      provider: "AWIN",
      status: "CONNECTED",
    });

    expect(programMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          workspaceId: "ws-1",
          provider: "AWIN",
          status: "CONNECTED",
        },
      }),
    );
  });

  it("scopes affiliate links and product options", async () => {
    linkMock.findMany.mockResolvedValueOnce([]);
    productMock.findMany.mockResolvedValueOnce([]);

    await listAffiliateLinks("ws-1", { programId: "program-1" });
    await listProductsForSelect("ws-1");

    expect(linkMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: "ws-1", programId: "program-1" },
      }),
    );
    expect(productMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          workspaceId: "ws-1",
          status: { not: "ARCHIVED" },
        },
      }),
    );
  });
});
