import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/client";
import type { CampaignStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireApiPermission(Permission.VIEW_CAMPAIGNS);
  if (guard) return guard.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const productId = searchParams.get("productId");

  const campaigns = await prisma.campaign.findMany({
    where: {
      ...(status ? { status: status as CampaignStatus } : {}),
      ...(productId ? { productId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ campaigns });
}
