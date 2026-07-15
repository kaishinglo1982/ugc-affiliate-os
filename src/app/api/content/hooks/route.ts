import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/audit/log";
import type { ContentHookStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireApiPermission(Permission.VIEW_CONTENT_BRIEFS);
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
  const briefId = searchParams.get("briefId");
  const status = searchParams.get("status");

  const hooks = await prisma.contentHook.findMany({
    where: {
      workspaceId: workspaceId,
      ...(briefId ? { briefId } : {}),
      ...(status ? { status: status as ContentHookStatus } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ hooks });
}

const createSchema = z.object({
  briefId: z.string().min(1),
  angle: z.string().min(1).max(300),
  body: z.string().max(5000).optional(),
  score: z.number().min(0).max(10).optional(),
  status: z.enum(["IDEA", "DRAFT", "APPROVED", "REJECTED"]).optional(),
});

export async function POST(request: Request) {
  const guard = await requireApiPermission(Permission.MANAGE_CONTENT_BRIEFS);
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
  const hook = await prisma.contentHook.create({
    data: { workspaceId: workspaceId, ...parsed.data },
  });

  await writeAuditLog({
    action: "content_hook.create",
    entityType: "ContentHook",
    entityId: hook.id,
    actor,
  });

  return NextResponse.json({ hook }, { status: 201 });
}
