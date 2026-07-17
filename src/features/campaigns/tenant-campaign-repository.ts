import type { Prisma } from "@/generated/prisma/client";

export interface TenantCampaignListInput {
  status?: Prisma.CampaignWhereInput["status"];
  take?: number;
}

/** Campaign data access restricted to an already scoped Prisma transaction. */
export function createTenantCampaignRepository(tx: Prisma.TransactionClient) {
  return {
    list(input: TenantCampaignListInput = {}) {
      return tx.campaign.findMany({
        where: input.status ? { status: input.status } : undefined,
        take: Math.min(Math.max(input.take ?? 50, 1), 100),
        orderBy: { updatedAt: "desc" },
        include: {
          product: true,
          affiliateLink: true,
        },
      });
    },

    findById(id: string) {
      return tx.campaign.findUnique({
        where: { id },
        include: {
          product: true,
          affiliateLink: true,
          scripts: true,
          videoJobs: true,
          socialPosts: true,
        },
      });
    },

    create(data: Prisma.CampaignCreateInput) {
      return tx.campaign.create({ data });
    },

    update(id: string, data: Prisma.CampaignUpdateInput) {
      return tx.campaign.update({ where: { id }, data });
    },

    remove(id: string) {
      return tx.campaign.delete({ where: { id } });
    },
  };
}

export type TenantCampaignRepository = ReturnType<
  typeof createTenantCampaignRepository
>;
