import type { Prisma } from "@/generated/prisma/client";

export async function listAffiliatePrograms(
  tx: Prisma.TransactionClient,
) {
  return tx.affiliateProgram.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      links: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getAffiliateProgram(
  tx: Prisma.TransactionClient,
  id: string,
) {
  return tx.affiliateProgram.findUnique({
    where: { id },
    include: {
      links: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function createAffiliateProgram(
  tx: Prisma.TransactionClient,
  data: Prisma.AffiliateProgramCreateInput,
) {
  return tx.affiliateProgram.create({ data });
}

export async function updateAffiliateProgram(
  tx: Prisma.TransactionClient,
  id: string,
  data: Prisma.AffiliateProgramUpdateInput,
) {
  return tx.affiliateProgram.update({ where: { id }, data });
}

export async function deleteAffiliateProgram(
  tx: Prisma.TransactionClient,
  id: string,
) {
  return tx.affiliateProgram.delete({ where: { id } });
}

export async function listAffiliateLinks(
  tx: Prisma.TransactionClient,
) {
  return tx.affiliateLink.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      program: true,
      product: true,
    },
  });
}

export async function createAffiliateLink(
  tx: Prisma.TransactionClient,
  data: Prisma.AffiliateLinkCreateInput,
) {
  return tx.affiliateLink.create({ data });
}

export async function updateAffiliateLink(
  tx: Prisma.TransactionClient,
  id: string,
  data: Prisma.AffiliateLinkUpdateInput,
) {
  return tx.affiliateLink.update({ where: { id }, data });
}

export async function deleteAffiliateLink(
  tx: Prisma.TransactionClient,
  id: string,
) {
  return tx.affiliateLink.delete({ where: { id } });
}
