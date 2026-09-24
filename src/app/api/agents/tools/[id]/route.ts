import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { prisma } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/audit/log";

export const dynamic = "force-dynamic";

const patchSchema = z.object({ enabled: z.boolean() });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiPermission(Permission.MANAGE_AGENT_TOOLS);
  if (guard) return guard.response;

  const { id } = await context.params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  const actor = (await getCurrentUser())?.id ?? "owner";
  const workspaceId = await resolveWorkspaceId();
  const existing = await prisma.agentToolDefinition.findFirst({
    where: { id, workspaceId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Tool nicht gefunden." }, { status: 404 });
  }

  const tool = await prisma.agentToolDefinition.update({
    where: { id: existing.id },
    data: { enabled: parsed.data.enabled },
  });

  await writeAuditLog({
    action: "agent_tool.update",
    entityType: "AgentToolDefinition",
    entityId: id,
    actor,
    metadata: { enabled: tool.enabled },
  });

  return NextResponse.json({ tool });
}
