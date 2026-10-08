import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveWorkspaceId, InvalidTenantTokenError } from "@/lib/auth/tenant";
import { withWorkspaceTransaction } from "@/lib/db/workspace-transaction";
import { writeAuditLog } from "@/lib/audit/log";
import type { AgentStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireApiPermission(Permission.VIEW_AGENTS);
  if (guard) return guard.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  let workspaceId: string;
  try { workspaceId = await resolveWorkspaceId(); }
  catch (e) {
    if (e instanceof InvalidTenantTokenError) return NextResponse.json({ error: "Ungültiges Tenant-Token." }, { status: 401 });
    throw e;
  }

  const agents = await withWorkspaceTransaction(workspaceId, (tx) =>
    tx.agent.findMany({ where: { workspaceId, ...(status ? { status: status as AgentStatus } : {}) }, orderBy: { createdAt: "desc" } }),
  );
  return NextResponse.json({ agents });
}

const createSchema = z.object({
  key: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  role: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  capabilities: z.array(z.string()).optional(),
  allowedActions: z.array(z.string()).optional(),
  status: z.enum(["IDLE", "RUNNING", "PAUSED", "ERROR"]).optional(),
});

export async function POST(request: Request) {
  const guard = await requireApiPermission(Permission.MANAGE_AGENTS);
  if (guard) return guard.response;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });

  const actor = (await getCurrentUser())?.id ?? "owner";
  let workspaceId: string;
  try { workspaceId = await resolveWorkspaceId(); }
  catch (e) {
    if (e instanceof InvalidTenantTokenError) return NextResponse.json({ error: "Ungültiges Tenant-Token." }, { status: 401 });
    throw e;
  }

  const agent = await withWorkspaceTransaction(workspaceId, (tx) => tx.agent.create({
    data: {
      workspaceId,
      key: parsed.data.key,
      name: parsed.data.name,
      role: parsed.data.role,
      description: parsed.data.description ?? "",
      capabilities: parsed.data.capabilities ?? [],
      allowedActions: parsed.data.allowedActions ?? [],
      status: (parsed.data.status ?? "IDLE") as AgentStatus,
    },
  }));

  await writeAuditLog({ action: "agent.create", entityType: "Agent", entityId: agent.id, actor });
  return NextResponse.json({ agent }, { status: 201 });
}
