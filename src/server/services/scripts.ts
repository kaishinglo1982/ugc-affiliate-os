import "server-only";
import { prisma } from "@/lib/db/client";

export async function listScripts() {
  return prisma.script.findMany({
    include: {
      product: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
      _count: { select: { versions: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getScriptById(id: string) {
  return prisma.script.findUnique({
    where: { id },
    include: {
      product: true,
      campaign: true,
      versions: { orderBy: { versionNumber: "desc" } },
    },
  });
}
