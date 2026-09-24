import "server-only";
import { prisma } from "@/lib/db/client";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import type {
  Prisma,
  ProductStatus,
  TrendStatus,
  RiskLevel,
} from "@/generated/prisma/client";

export interface ProductListFilters {
  search?: string;
  status?: string;
  category?: string;
  trend?: string;
  risk?: string;
  favoritesOnly?: boolean;
  includeArchived?: boolean;
  sort?: "score" | "name" | "createdAt" | "price";
}

export async function listProducts(filters: ProductListFilters) {
  const workspaceId = await resolveWorkspaceId();
  const where: Prisma.ProductWhereInput = { workspaceId };

  if (!filters.includeArchived) {
    where.status = { not: "ARCHIVED" };
  }
  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status as ProductStatus;
  }
  if (filters.category && filters.category !== "ALL") {
    where.categoryLabel = filters.category;
  }
  if (filters.trend && filters.trend !== "ALL") {
    where.trend = filters.trend as TrendStatus;
  }
  if (filters.risk && filters.risk !== "ALL") {
    where.risk = filters.risk as RiskLevel;
  }
  if (filters.favoritesOnly) {
    where.isFavorite = true;
  }
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { vendor: { contains: filters.search, mode: "insensitive" } },
      { categoryLabel: { contains: filters.search, mode: "insensitive" } },
      { tags: { has: filters.search } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    include: { scores: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy:
      filters.sort === "name"
        ? { name: "asc" }
        : filters.sort === "price"
          ? { price: "desc" }
          : { createdAt: "desc" },
  });

  const withScore = products.map((p) => ({
    ...p,
    latestScore: p.scores[0]?.totalScore ?? 0,
  }));

  if (filters.sort === "score" || !filters.sort) {
    withScore.sort((a, b) => b.latestScore - a.latestScore);
  }

  return withScore;
}

export async function getProductById(id: string) {
  const workspaceId = await resolveWorkspaceId();
  return prisma.product.findFirst({
    where: { id, workspaceId },
    include: {
      scores: { orderBy: { createdAt: "desc" }, take: 1 },
      affiliateLinks: { include: { program: true } },
      campaigns: true,
    },
  });
}

export async function listProductCategories(): Promise<string[]> {
  const workspaceId = await resolveWorkspaceId();
  const products = await prisma.product.findMany({
    where: { workspaceId, categoryLabel: { not: null } },
    select: { categoryLabel: true },
    distinct: ["categoryLabel"],
  });
  return products.map((p) => p.categoryLabel).filter((c): c is string => Boolean(c));
}
