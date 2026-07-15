import "server-only";
import { prisma } from "@/lib/db/client";
import type { AgentMemoryType } from "@/generated/prisma/client";

export async function listAgentMemory(
  workspaceId: string,
  filters?: { agentKey?: string; type?: string; status?: string },
) {
  return prisma.agentMemoryEntry.findMany({
    where: {
      workspaceId,
      ...(filters?.agentKey ? { agentKey: filters.agentKey } : {}),
      ...(filters?.type ? { type: filters.type as AgentMemoryType } : {}),
      ...(filters?.status ? { status: filters.status as never } : {}),
    },
    orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
  });
}

export async function getAgentMemoryEntry(id: string, workspaceId: string) {
  return prisma.agentMemoryEntry.findFirst({
    where: { id, workspaceId },
  });
}
