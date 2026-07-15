import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/client";
import type { AffiliateProviderKey } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireApiPermission(Permission.VIEW_AFFILIATE_PROGRAMS);
  if (guard) return guard.response;

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");
  const status = searchParams.get("status");

  const programs = await prisma.affiliateProgram.findMany({
    where: {
      ...(provider ? { provider: provider as AffiliateProviderKey } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ programs });
}
