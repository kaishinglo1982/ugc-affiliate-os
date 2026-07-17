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
    listProducts: createTenantHandler(dependencies, "VIEWER", async (tx) =>
      createTenantProductRepository(tx).list(),
    ),
    createProduct: createTenantHandler(dependencies, "OPERATOR", async (tx, _context) => {
      const data = await readJson<Prisma.ProductCreateInput>(currentRequest());
      return createTenantProductRepository(tx).create(data);
    }),
    listCampaigns: createTenantHandler(dependencies, "VIEWER", async (tx) =>
      createTenantCampaignRepository(tx).list(),
    ),
    createCampaign: createTenantHandler(dependencies, "OPERATOR", async (tx) => {
      const data = await readJson<Prisma.CampaignCreateInput>(currentRequest());
      return createTenantCampaignRepository(tx).create(data);
    }),
    listAffiliatePrograms: createTenantHandler(dependencies, "VIEWER", (tx) =>
      listAffiliatePrograms(tx),
    ),
    createAffiliateProgram: createTenantHandler(dependencies, "ADMIN", async (tx) => {
      const data = await readJson<Prisma.AffiliateProgramCreateInput>(currentRequest());
      return createAffiliateProgram(tx, data);
    }),
    listAffiliateLinks: createTenantHandler(dependencies, "VIEWER", (tx) =>
      listAffiliateLinks(tx),
    ),
    createAffiliateLink: createTenantHandler(dependencies, "OPERATOR", async (tx) => {
      const data = await readJson<Prisma.AffiliateLinkCreateInput>(currentRequest());
      return createAffiliateLink(tx, data);
    }),
    listVideoJobs: createTenantHandler(dependencies, "VIEWER", (tx) => listVideoJobs(tx)),
    createVideoJob: createTenantHandler(dependencies, "OPERATOR", async (tx) => {
      const data = await readJson<Prisma.VideoJobCreateInput>(currentRequest());
      return createVideoJob(tx, data);
    }),
  };
}

// Next.js route modules should bind their Request through createRequestBoundHandler.
let activeRequest: Request | undefined;
function currentRequest(): Request {
  if (!activeRequest) throw new Error("Tenant handler request is not bound.");
  return activeRequest;
}

export function createRequestBoundHandler(
  handler: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request) => {
    activeRequest = request;
    try {
      return await handler(request);
    } finally {
      activeRequest = undefined;
    }
  };
}
