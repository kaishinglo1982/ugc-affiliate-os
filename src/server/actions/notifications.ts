"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { runMutation } from "@/server/actions/action-helpers";
import { resolveWorkspaceId } from "@/lib/auth/tenant";

const markReadSchema = z.object({ id: z.string().uuid() });

export async function markNotificationReadAction(id: string) {
  const result = await runMutation({
    schema: markReadSchema,
    input: { id },
    auditAction: "notification.read",
    entityType: "Notification",
    handler: async (input) => {
      const workspaceId = await resolveWorkspaceId();
      const existing = await prisma.notification.findFirst({ where: { id: input.id, workspaceId } });
      if (!existing) throw new Error("NOTIFICATION_NOT_FOUND");
      const notification = await prisma.notification.update({
        where: { id: existing.id },
        data: { readAt: new Date() },
      });
      return notification;
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
    handler: async () => {
      const workspaceId = await resolveWorkspaceId();
      await prisma.notification.updateMany({
        where: { workspaceId, readAt: null },
        data: { readAt: new Date() },
      });
      return { updated: true };
    },
  });
  revalidatePath("/app", "layout");
  return result;
}
