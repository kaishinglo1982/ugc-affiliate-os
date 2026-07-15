import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { prisma } from "@/lib/db/client";
import type { ProductStatus, RiskLevel } from "@/generated/prisma/client";

export async function GET(request: Request) {
  const guard = await requireApiPermission("products.read");
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
  const status = searchParams.get("status");
  const categoryId = searchParams.get("categoryId");
  const riskLevel = searchParams.get("riskLevel");
  const search = searchParams.get("search");
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");

  const limit = limitParam ? Math.max(1, Number(limitParam) || 50) : 50;
  const offset = offsetParam ? Math.max(0, Number(offsetParam) || 0) : 0;

  const products = await prisma.product.findMany({
    where: {
      workspaceId: workspaceId,
      ...(status ? { status: status as ProductStatus } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(riskLevel ? { riskLevel: riskLevel as RiskLevel } : {}),
      ...(search
        ? {
            OR: [
              { canonicalName: { contains: search } },
              { brandName: { contains: search } },
            ],
          }
        : {}),
    },
    include: {
      offers: { take: 1, select: { id: true, status: true, provider: true } },
      complianceProfiles: {
        orderBy: { evaluatedAt: "desc" },
        take: 1,
        select: { status: true, riskLevel: true },
      },
      opportunities: {
        orderBy: { calculatedAt: "desc" },
        take: 1,
        select: { totalScore: true, status: true },
      },
    },
    take: limit,
    skip: offset,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ products });
}
