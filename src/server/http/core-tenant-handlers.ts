import type { Prisma } from "@/generated/prisma/client";

import { createTenantCampaignRepository } from "@/features/campaigns/tenant-campaign-repository";
import { createTenantProductRepository } from "@/features/products/tenant-product-repository";
import {
  createAffiliateLink,
  createAffiliateProgram,
  deleteAffiliateLink,
  deleteAffiliateProgram,
  getAffiliateProgram,
  listAffiliateLinks,
  listAffiliatePrograms,
  updateAffiliateLink,
  updateAffiliateProgram,
} from "@/server/repositories/affiliate-repository";
import {
  cancelVideoJob,
  createVideoJob,
  getVideoJob,
  listVideoJobs,
  updateVideoJob,
} from "@/server/repositories/video-job-repository";
import {
  createTenantHandler,
  TenantHttpError,
  type TenantHandlerDependencies,
} from "@/server/http/tenant-handler";

async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

function resourceId(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const id = segments.at(-1);
  if (!id) throw new TenantHttpError(400, "Missing resource id");
  return id;
}

export function createCoreTenantHandlers(dependencies: TenantHandlerDependencies) {
  return {
    listProducts: createTenantHandler(dependencies, "VIEWER", async (_request, tx) =>
      createTenantProductRepository(tx).list(),
    ),
    getProduct: createTenantHandler(dependencies, "VIEWER", async (request, tx) =>
      createTenantProductRepository(tx).findById(resourceId(request)),
    ),
    createProduct: createTenantHandler(dependencies, "OPERATOR", async (request, tx) => {
      const data = await readJson<Prisma.ProductCreateInput>(request);
      return createTenantProductRepository(tx).create(data);
    }),
    updateProduct: createTenantHandler(dependencies, "OPERATOR", async (request, tx) => {
      const data = await readJson<Prisma.ProductUpdateInput>(request);
      return createTenantProductRepository(tx).update(resourceId(request), data);
    }),
    archiveProduct: createTenantHandler(dependencies, "ADMIN", async (request, tx) =>
      createTenantProductRepository(tx).archive(resourceId(request)),
    ),

    listCampaigns: createTenantHandler(dependencies, "VIEWER", async (_request, tx) =>
      createTenantCampaignRepository(tx).list(),
    ),
    getCampaign: createTenantHandler(dependencies, "VIEWER", async (request, tx) =>
      createTenantCampaignRepository(tx).findById(resourceId(request)),
    ),
    createCampaign: createTenantHandler(dependencies, "OPERATOR", async (request, tx) => {
      const data = await readJson<Prisma.CampaignCreateInput>(request);
      return createTenantCampaignRepository(tx).create(data);
    }),
    updateCampaign: createTenantHandler(dependencies, "OPERATOR", async (request, tx) => {
      const data = await readJson<Prisma.CampaignUpdateInput>(request);
      return createTenantCampaignRepository(tx).update(resourceId(request), data);
    }),
    deleteCampaign: createTenantHandler(dependencies, "ADMIN", async (request, tx) =>
      createTenantCampaignRepository(tx).remove(resourceId(request)),
    ),

    listAffiliatePrograms: createTenantHandler(dependencies, "VIEWER", (_request, tx) =>
      listAffiliatePrograms(tx),
    ),
    getAffiliateProgram: createTenantHandler(dependencies, "VIEWER", (request, tx) =>
      getAffiliateProgram(tx, resourceId(request)),
    ),
    createAffiliateProgram: createTenantHandler(dependencies, "ADMIN", async (request, tx) => {
      const data = await readJson<Prisma.AffiliateProgramCreateInput>(request);
      return createAffiliateProgram(tx, data);
    }),
    updateAffiliateProgram: createTenantHandler(dependencies, "ADMIN", async (request, tx) => {
      const data = await readJson<Prisma.AffiliateProgramUpdateInput>(request);
      return updateAffiliateProgram(tx, resourceId(request), data);
    }),
    deleteAffiliateProgram: createTenantHandler(dependencies, "OWNER", (request, tx) =>
      deleteAffiliateProgram(tx, resourceId(request)),
    ),

    listAffiliateLinks: createTenantHandler(dependencies, "VIEWER", (_request, tx) =>
      listAffiliateLinks(tx),
    ),
    createAffiliateLink: createTenantHandler(dependencies, "OPERATOR", async (request, tx) => {
      const data = await readJson<Prisma.AffiliateLinkCreateInput>(request);
      return createAffiliateLink(tx, data);
    }),
    updateAffiliateLink: createTenantHandler(dependencies, "OPERATOR", async (request, tx) => {
      const data = await readJson<Prisma.AffiliateLinkUpdateInput>(request);
      return updateAffiliateLink(tx, resourceId(request), data);
    }),
    deleteAffiliateLink: createTenantHandler(dependencies, "ADMIN", (request, tx) =>
      deleteAffiliateLink(tx, resourceId(request)),
    ),

    listVideoJobs: createTenantHandler(dependencies, "VIEWER", (_request, tx) =>
      listVideoJobs(tx),
    ),
    getVideoJob: createTenantHandler(dependencies, "VIEWER", (request, tx) =>
      getVideoJob(tx, resourceId(request)),
    ),
    createVideoJob: createTenantHandler(dependencies, "OPERATOR", async (request, tx) => {
      const data = await readJson<Prisma.VideoJobCreateInput>(request);
      return createVideoJob(tx, data);
    }),
    updateVideoJob: createTenantHandler(dependencies, "OPERATOR", async (request, tx) => {
      const data = await readJson<Prisma.VideoJobUpdateInput>(request);
      return updateVideoJob(tx, resourceId(request), data);
    }),
    cancelVideoJob: createTenantHandler(dependencies, "OPERATOR", (request, tx) =>
      cancelVideoJob(tx, resourceId(request)),
    ),
  };
}
