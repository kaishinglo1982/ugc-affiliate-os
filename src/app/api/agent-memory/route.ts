import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { withWorkspaceDb } from "@/lib/db/workspace-context";
import { writeAuditLog } from "@/lib/audit/log";
import type { AgentMemoryType, Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireApiPermission(Permission.VIEW_AGENT_MEMORY);
  if (guard) return guard.response;

  let workspaceId: string;
  try {
    workspaceId = await resolveWorkspaceId();
  } catch (e) {
    if (e instanceof InvalidTenantTokenError) {
      return NextResponse.json({ error: "Ungültiges Tenant-Token." }, { status: 401 });
    }
    throw e;
  }

  const { searchParams } = new URL(request.url);
  const agentKey = searchParams.get("agentKey");
  const type = searchParams.get("type");

  if (!agentKey) {
    return NextResponse.json({ error: "agentKey ist erforderlich." }, { status: 400 });
  }

  const entries = await withWorkspaceDb(
    (tx) =>
      tx.agentMemoryEntry.findMany({
        where: {
          workspaceId,
          agentKey,
          ...(type ? { type: type as AgentMemoryType } : {}),
        },
        orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
      }),
    workspaceId,
  );

  return NextResponse.json({ entries });
}

const createSchema = z.object({
  agentKey: z.string().min(1).max(100),
  type: z.enum(["FACT", "PREFERENCE", "CONTEXT"]).optional(),
  key: z.string().min(1).max(200),
  value: z.unknown().optional(),
  importance: z.number().int().min(1).max(10).optional(),
  expiresAt: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  const guard = await requireApiPermission(Permission.MANAGE_AGENT_MEMORY);
  if (guard) return guard.response;

  let workspaceId: string;
  try {
    workspaceId = await resolveWorkspaceId();
  } catch (e) {
    if (e instanceof InvalidTenantTokenError) {
      return NextResponse.json({ error: "Ungültiges Tenant-Token." }, { status: 401 });
    }
    throw e;
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  const actor = (await getCurrentUser())?.id ?? "owner";
  const entry = await withWorkspaceDb(
    (tx) =>
      tx.agentMemoryEntry.create({
        data: {
          workspaceId,
          agentKey: parsed.data.agentKey,
          type: (parsed.data.type ?? "FACT") as AgentMemoryType,
          key: parsed.data.key,
          value: parsed.data.value as Prisma.InputJsonValue | undefined,
          importance: parsed.data.importance ?? 1,
          expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        },
      }),
    workspaceId,
  );

  await writeAuditLog({
    action: "agent_memory.create",
    entityType: "AgentMemoryEntry",
    entityId: entry.id,
    actor,
  });

  return NextResponse.json({ entry }, { status: 201 });
}
