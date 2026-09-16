import { withWorkspaceDb } from "@/lib/db/workspace-context";

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  actor: string | null;
  createdAt: Date;
}

export async function listAudit(): Promise<AuditEntry[]> {
  const entries = await withWorkspaceDb((tx) =>
    tx.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  );

  return entries.map((e) => ({
    id: e.id,
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId,
    actor: e.actor,
    createdAt: e.createdAt,
  }));
}
