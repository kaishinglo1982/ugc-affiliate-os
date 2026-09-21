"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withWorkspaceDb } from "@/lib/db/workspace-context";
import { runMutation } from "@/server/actions/action-helpers";

const markReadSchema = z.object({ id: z.string().uuid() });

export async function markNotificationReadAction(id: string) {
  const result = await runMutation({
    schema: markReadSchema,
    input: { id },
    auditAction: "notification.read",
    entityType: "Notification",
    handler: async (input) =>
      withWorkspaceDb(async (tx) => {
        const visible = await tx.notification.findUnique({
          where: { id: input.id },
          select: { id: true },
        });
        if (!visible) throw new Error("NOTIFICATION_NOT_FOUND");

        return tx.notification.update({
          where: { id: visible.id },
          data: { readAt: new Date() },
        });
      }),
    entityId: (output) => output.id,
  });
  revalidatePath("/app", "layout");
  return result;
}

export async function markAllNotificationsReadAction() {
  const result = await runMutation({
    schema: z.object({}),
    input: {},
    auditAction: "notification.read_all",
    entityType: "Notification",
    handler: async () =>
      withWorkspaceDb(async (tx) => {
        const updated = await tx.notification.updateMany({
          where: { readAt: null },
          data: { readAt: new Date() },
        });
        return { updated: true, count: updated.count };
      }),
  });
  revalidatePath("/app", "layout");
  return result;
}
