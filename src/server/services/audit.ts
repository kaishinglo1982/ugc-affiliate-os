import { prisma } from "@/lib/db/client";

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  actor: string | null;
  createdAt: Date;
}

export async function listAudit(workspaceId: string): Promise<AuditEntry[]> {
  const entries = await prisma.auditLog.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return entries.map((e) => ({
    id: e.id,
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId,
    actor: e.actor,
    createdAt: e.createdAt,
  }));
}
