import { prisma } from "@/lib/db/client";
import type { Prisma } from "@/generated/prisma/client";

interface AuditEntryInput {
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  requestId?: string;
  actor?: string;
}

/** Writes one audit trail entry. Never throws — audit failures must not break the mutation. */
export async function writeAuditLog(entry: AuditEntryInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
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
