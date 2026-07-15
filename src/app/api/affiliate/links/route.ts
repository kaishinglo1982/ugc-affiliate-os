import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireApiPermission(Permission.VIEW_AFFILIATE_LINKS);
  if (guard) return guard.response;

  const { searchParams } = new URL(request.url);
  const programId = searchParams.get("programId");
  const productId = searchParams.get("productId");

  const links = await prisma.affiliateLink.findMany({
    where: {
      ...(programId ? { programId } : {}),
      ...(productId ? { productId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ links });
}
