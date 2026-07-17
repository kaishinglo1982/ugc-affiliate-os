import type { Prisma } from "@/generated/prisma/client";

export interface TenantProductListInput {
  status?: Prisma.ProductWhereInput["status"];
  take?: number;
  cursorId?: string;
}

/**
 * Product data access for tenant services.
 *
 * The repository intentionally accepts only Prisma.TransactionClient. Tenant
 * visibility is enforced by the active PostgreSQL RLS transaction context.
 */
export function createTenantProductRepository(tx: Prisma.TransactionClient) {
  return {
    list(input: TenantProductListInput = {}) {
      return tx.product.findMany({
        where: input.status ? { status: input.status } : undefined,
        take: Math.min(Math.max(input.take ?? 50, 1), 100),
        ...(input.cursorId
          ? { cursor: { id: input.cursorId }, skip: 1 }
          : {}),
        orderBy: { createdAt: "desc" },
      });
    },

    findById(id: string) {
      return tx.product.findUnique({ where: { id } });
    },

    create(data: Prisma.ProductCreateInput) {
      return tx.product.create({ data });
    },

    update(id: string, data: Prisma.ProductUpdateInput) {
      return tx.product.update({ where: { id }, data });
    },

    archive(id: string, archivedAt = new Date()) {
      return tx.product.update({
        where: { id },
        data: { archivedAt, status: "ARCHIVED" },
      });
    },
  };
}

export type TenantProductRepository = ReturnType<
  typeof createTenantProductRepository
>;
