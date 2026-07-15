import "server-only";
import { prisma } from "@/lib/db/client";
import type { AgentStatus, AgentRunStatus } from "@/generated/prisma/client";

export async function listAgents(workspaceId: string, filters?: { status?: string }) {
  return prisma.agent.findMany({
    where: {
      workspaceId,
      ...(filters?.status ? { status: filters.status as AgentStatus } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAgent(id: string, workspaceId: string) {
  return prisma.agent.findFirst({
    where: { id, workspaceId },
    include: {
      runs: { orderBy: { startedAt: "desc" }, take: 10 },
    },
  });
}

export async function listAgentRuns(workspaceId: string, filters?: { agentId?: string; status?: string }) {
  return prisma.agentRun.findMany({
    where: {
      workspaceId,
      ...(filters?.agentId ? { agentId: filters.agentId } : {}),
      ...(filters?.status ? { status: filters.status as AgentRunStatus } : {}),
    },
    orderBy: { startedAt: "desc" },
    include: { agent: { select: { id: true, name: true, key: true } } },
  });
}

export async function getAgentRun(id: string, workspaceId: string) {
  return prisma.agentRun.findFirst({
    where: { id, workspaceId },
    include: {
      agent: { select: { id: true, name: true, key: true } },
      toolCalls: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function listAgentTools(workspaceId: string) {
  return prisma.agentToolDefinition.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
    include: { policies: true },
  });
}
