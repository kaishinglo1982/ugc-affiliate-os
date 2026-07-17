import type { Prisma } from "@/generated/prisma/client";

import { createTenantCampaignRepository } from "@/features/campaigns/tenant-campaign-repository";
import { createTenantProductRepository } from "@/features/products/tenant-product-repository";
import {
  createAffiliateLink,
  createAffiliateProgram,
  listAffiliateLinks,
  listAffiliatePrograms,
} from "@/server/repositories/affiliate-repository";
import {
  createVideoJob,
  listVideoJobs,
} from "@/server/repositories/video-job-repository";
import {
  createTenantHandler,
  type TenantHandlerDependencies,
} from "@/server/http/tenant-handler";

async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

export function createCoreTenantHandlers(dependencies: TenantHandlerDependencies) {
  return {
    listProducts: createTenantHandler(dependencies, "VIEWER", async (_request, tx) =>
      createTenantProductRepository(tx).list(),
    ),
    createProduct: createTenantHandler(dependencies, "OPERATOR", async (request, tx) => {
      const data = await readJson<Prisma.ProductCreateInput>(request);
      return createTenantProductRepository(tx).create(data);
    }),
    listCampaigns: createTenantHandler(dependencies, "VIEWER", async (_request, tx) =>
      createTenantCampaignRepository(tx).list(),
    ),
    createCampaign: createTenantHandler(dependencies, "OPERATOR", async (request, tx) => {
      const data = await readJson<Prisma.CampaignCreateInput>(request);
      return createTenantCampaignRepository(tx).create(data);
    }),
    listAffiliatePrograms: createTenantHandler(dependencies, "VIEWER", (_request, tx) =>
      listAffiliatePrograms(tx),
    ),
    createAffiliateProgram: createTenantHandler(dependencies, "ADMIN", async (request, tx) => {
      const data = await readJson<Prisma.AffiliateProgramCreateInput>(request);
      return createAffiliateProgram(tx, data);
    }),
    listAffiliateLinks: createTenantHandler(dependencies, "VIEWER", (_request, tx) =>
      listAffiliateLinks(tx),
    ),
    createAffiliateLink: createTenantHandler(dependencies, "OPERATOR", async (request, tx) => {
      const data = await readJson<Prisma.AffiliateLinkCreateInput>(request);
      return createAffiliateLink(tx, data);
    }),
    listVideoJobs: createTenantHandler(dependencies, "VIEWER", (_request, tx) =>
      listVideoJobs(tx),
    ),
    createVideoJob: createTenantHandler(dependencies, "OPERATOR", async (request, tx) => {
      const data = await readJson<Prisma.VideoJobCreateInput>(request);
      return createVideoJob(tx, data);
    }),
  };
}
