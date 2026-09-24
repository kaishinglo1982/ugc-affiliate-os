import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/audit/log";
import type { ContentBriefStatus } from "@/generated/prisma/client";

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
  const campaignId = searchParams.get("campaignId");
  const status = searchParams.get("status");

  const briefs = await prisma.contentBrief.findMany({
    where: {
      workspaceId: workspaceId,
      ...(campaignId ? { campaignId } : {}),
      ...(status ? { status: status as ContentBriefStatus } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ briefs });
}

const createSchema = z.object({
  campaignId: z.string().optional(),
  objective: z.string().min(1).max(500),
  targetAudience: z.string().max(500).optional(),
  platform: z.string().max(100).optional(),
  hookAngle: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
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

  if (parsed.data.campaignId) {
    const campaign = await prisma.campaign.findFirst({ where: { id: parsed.data.campaignId, workspaceId }, select: { id: true } });
    if (!campaign) return NextResponse.json({ error: "Kampagne nicht gefunden." }, { status: 404 });
  }

  const actor = (await getCurrentUser())?.id ?? "owner";
  const brief = await prisma.contentBrief.create({
    data: { workspaceId: workspaceId, createdBy: actor, ...parsed.data },
  });

  await writeAuditLog({
    action: "content_brief.create",
    entityType: "ContentBrief",
    entityId: brief.id,
    actor,
  });

  return NextResponse.json({ brief }, { status: 201 });
}
