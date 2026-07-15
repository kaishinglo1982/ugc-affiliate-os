import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/audit/log";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiPermission(Permission.MANAGE_AGENTS);
  if (guard) return guard.response;

  const { id } = await context.params;
  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) {
    return NextResponse.json({ error: "Agent nicht gefunden." }, { status: 404 });
  }

  const actor = (await getCurrentUser())?.id ?? "owner";
  const run = await prisma.agentRun.create({
    data: { agentId: id, status: "RUNNING" },
  });

  await prisma.agent.update({ where: { id }, data: { status: "RUNNING", lastRunAt: new Date() } });

  await writeAuditLog({
    action: "agent.run",
    entityType: "AgentRun",
    entityId: run.id,
    actor,
    metadata: { agentId: id },
  });

  return NextResponse.json({ run }, { status: 201 });
}
