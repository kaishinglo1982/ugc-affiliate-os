import { withWorkspaceDb } from "@/lib/db/workspace-context";
import type { Prisma } from "@/generated/prisma/client";

interface AuditEntryInput {
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  requestId?: string;
  actor?: string;
}

/** Writes one tenant-scoped audit entry. Never throws — audit failures must not break the mutation. */
export async function writeAuditLog(entry: AuditEntryInput): Promise<void> {
  try {
    await withWorkspaceDb((tx) =>
      tx.auditLog.create({
        data: {
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          metadata: entry.metadata,
          requestId: entry.requestId,
          actor: entry.actor ?? "owner",
        },
      }),
    );
  } catch (error) {
    console.error("[audit] failed to write tenant-scoped audit log entry", error);
  }
}
