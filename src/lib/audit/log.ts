import { prisma } from "@/lib/db/client";
import type { Prisma } from "@/generated/prisma/client";

interface AuditEntryInput {
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  requestId?: string;
  actor?: string;
  workspaceId?: string;
}

export async function writeAuditLog(entry: AuditEntryInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        workspaceId:
          entry.workspaceId ?? "00000000-0000-0000-0000-000000000001",
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata,
        requestId: entry.requestId,
        actor: entry.actor ?? "owner",
      },
    });
  } catch (error) {
    console.error("[audit] failed to write audit log entry", error);
  }
}
