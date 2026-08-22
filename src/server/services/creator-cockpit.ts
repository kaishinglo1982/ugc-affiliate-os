import "server-only";
import { prisma } from "@/lib/db/client";

export async function getCreatorCockpit(workspaceId: string) {
  const [
    campaigns,
    scripts,
    videos,
    posts,
    activeWorkflows,
    runningAgents,
    recentRuns,
  ] = await Promise.all([
    prisma.campaign.count({ where: { workspaceId } }),
    prisma.script.groupBy({
      by: ["status"],
      where: { workspaceId },
      _count: { _all: true },
    }),
    prisma.videoJob.groupBy({
      by: ["status"],
      where: { workspaceId },
      _count: { _all: true },
    }),
    prisma.socialPost.groupBy({
      by: ["status"],
      where: { workspaceId },
      _count: { _all: true },
    }),
    prisma.workflowRun.count({
      where: { workspaceId, status: "RUNNING" },
    }),
    prisma.agentRun.count({
      where: { workspaceId, status: "RUNNING" },
    }),
    prisma.workflowRun.findMany({
      where: { workspaceId },
      orderBy: { startedAt: "desc" },
      take: 10,
      include: {
        workflow: { select: { id: true, name: true } },
        steps: {
          orderBy: { startedAt: "desc" },
          take: 5,
          select: {
            id: true,
            status: true,
            startedAt: true,
            finishedAt: true,
            error: true,
          },
        },
      },
    }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      campaigns,
      activeWorkflows,
      runningAgents,
      scripts: Object.fromEntries(
        scripts.map((item) => [item.status, item._count._all]),
      ),
      videos: Object.fromEntries(
        videos.map((item) => [item.status, item._count._all]),
      ),
      posts: Object.fromEntries(
        posts.map((item) => [item.status, item._count._all]),
      ),
    },
    recentRuns,
  };
}
