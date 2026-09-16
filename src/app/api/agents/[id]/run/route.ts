import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { getCurrentUser } from "@/lib/auth/current-user";
import { withWorkspaceDb } from "@/lib/db/workspace-context";
import { writeAuditLog } from "@/lib/audit/log";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiPermission(Permission.MANAGE_AGENTS);
  if (guard) return guard.response;

  const { id } = await context.params;
  const actor = (await getCurrentUser())?.id ?? "owner";

  const run = await withWorkspaceDb(async (tx) => {
    const agent = await tx.agent.findUnique({ where: { id }, select: { id: true } });
    if (!agent) return null;

    const created = await tx.agentRun.create({
      data: { agentId: agent.id, status: "RUNNING" },
    });

    await tx.agent.update({
      where: { id: agent.id },
      data: { status: "RUNNING", lastRunAt: new Date() },
    });

    return created;
  });

  if (!run) {
    return NextResponse.json({ error: "Agent nicht gefunden." }, { status: 404 });
  }

  await writeAuditLog({
    action: "agent.run",
    entityType: "AgentRun",
    entityId: run.id,
    actor,
    metadata: { agentId: id },
  });

  return NextResponse.json({ run }, { status: 201 });
}
