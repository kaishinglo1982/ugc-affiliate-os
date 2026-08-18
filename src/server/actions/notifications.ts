"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { runMutation } from "@/server/actions/action-helpers";

const markReadSchema = z.object({ id: z.string().uuid() });

export async function markNotificationReadAction(id: string) {
  const result = await runMutation({
    schema: markReadSchema,
    input: { id },
    auditAction: "notification.read",
    entityType: "Notification",
    handler: async (input, _user, workspaceId) => {
      const notification = await prisma.notification.findFirst({
        where: { id: input.id, workspaceId },
        select: { id: true },
      });
      if (!notification) throw new Error("NOTIFICATION_NOT_FOUND");
      return prisma.notification.update({
        where: { id: notification.id },
        data: { readAt: new Date() },
      });
    },
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
    handler: async (_input, _user, workspaceId) => {
      const updated = await prisma.notification.updateMany({
        where: { workspaceId, readAt: null },
        data: { readAt: new Date() },
      });
      return { updated: updated.count };
    },
  });
  revalidatePath("/app", "layout");
  return result;
}
