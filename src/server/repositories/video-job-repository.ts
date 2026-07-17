import type { Prisma } from "@/generated/prisma/client";

export async function listVideoJobs(
  tx: Prisma.TransactionClient,
) {
  return tx.videoJob.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      script: true,
      product: true,
      campaign: true,
      mediaAssets: true,
    },
  });
}

export async function getVideoJob(
  tx: Prisma.TransactionClient,
  id: string,
) {
  return tx.videoJob.findUnique({
    where: { id },
    include: {
      script: true,
      product: true,
      campaign: true,
      mediaAssets: true,
    },
  });
}

export async function createVideoJob(
  tx: Prisma.TransactionClient,
  data: Prisma.VideoJobCreateInput,
) {
  return tx.videoJob.create({ data });
}

export async function updateVideoJob(
  tx: Prisma.TransactionClient,
  id: string,
  data: Prisma.VideoJobUpdateInput,
) {
  return tx.videoJob.update({ where: { id }, data });
}

export async function cancelVideoJob(
  tx: Prisma.TransactionClient,
  id: string,
) {
  return tx.videoJob.update({
    where: { id },
    data: {
      status: "CANCELLED",
    },
  });
}
