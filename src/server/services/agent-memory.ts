import "server-only";
import { withWorkspaceDb } from "@/lib/db/workspace-context";
import type { AgentMemoryType } from "@/generated/prisma/client";

export async function listAgentMemory(
  workspaceId: string,
  filters?: { agentKey?: string; type?: string; status?: string },
) {
  return withWorkspaceDb(
    (tx) =>
      tx.agentMemoryEntry.findMany({
        where: {
          workspaceId,
          ...(filters?.agentKey ? { agentKey: filters.agentKey } : {}),
          ...(filters?.type ? { type: filters.type as AgentMemoryType } : {}),
          ...(filters?.status ? { status: filters.status as never } : {}),
        },
        orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
      }),
    workspaceId,
  );
}

export async function getAgentMemoryEntry(id: string, workspaceId: string) {
  return withWorkspaceDb(
    (tx) =>
      tx.agentMemoryEntry.findFirst({
        where: { id, workspaceId },
      }),
    workspaceId,
  );
}
