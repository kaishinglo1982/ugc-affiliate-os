import "server-only";

import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { withWorkspaceTransaction } from "@/lib/db/workspace-transaction";

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  actor: string | null;
  createdAt: Date;
}

export async function listAudit(): Promise<AuditEntry[]> {
  const workspaceId = await resolveWorkspaceId();
  const entries = await withWorkspaceTransaction(workspaceId, (tx) =>
    tx.auditLog.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 100 }),
  );
  return entries.map((e) => ({ id: e.id, action: e.action, entityType: e.entityType, entityId: e.entityId, actor: e.actor, createdAt: e.createdAt }));
}
