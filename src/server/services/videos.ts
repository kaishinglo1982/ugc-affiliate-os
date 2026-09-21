import "server-only";
import { withWorkspaceDb } from "@/lib/db/workspace-context";

export async function listVideoJobs() {
  return withWorkspaceDb((tx) =>
    tx.videoJob.findMany({
      include: {
        script: { select: { id: true, title: true } },
        product: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  );
}

export async function getVideoJobById(id: string) {
  return withWorkspaceDb((tx) =>
    tx.videoJob.findUnique({
      where: { id },
      include: {
        script: true,
        product: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
        mediaAssets: true,
      },
    }),
  );
}
