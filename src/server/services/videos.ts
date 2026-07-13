import "server-only";
import { prisma } from "@/lib/db/client";

export async function listVideoJobs() {
  return prisma.videoJob.findMany({
    include: {
      script: { select: { id: true, title: true } },
      product: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getVideoJobById(id: string) {
  return prisma.videoJob.findUnique({
    where: { id },
    include: {
      script: true,
      product: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
      mediaAssets: true,
    },
  });
}
