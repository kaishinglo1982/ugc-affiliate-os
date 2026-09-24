import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/audit/log";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import type { AgentStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["IDLE", "RUNNING", "PAUSED", "ERROR"]),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiPermission(Permission.MANAGE_AGENTS);
  if (guard) return guard.response;

  const { id } = await context.params;
  const workspaceId = await resolveWorkspaceId();
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  const actor = (await getCurrentUser())?.id ?? "owner";
  const existing = await prisma.agent.findFirst({ where: { id, workspaceId } });
  if (!existing) return NextResponse.json({ error: "Agent nicht gefunden." }, { status: 404 });
  const agent = await prisma.agent.update({
    where: { id: existing.id, workspaceId },
    data: {
      status: parsed.data.status as AgentStatus,
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
    },
  });

  await writeAuditLog({
    action: "agent.update",
    entityType: "Agent",
    entityId: agent.id,
    actor,
    metadata: { status: agent.status },
  });

  return NextResponse.json({ agent });
}
