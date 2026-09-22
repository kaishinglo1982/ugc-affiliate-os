/**
 * Phase 7 — Product Discovery Query application service.
 *
 * CRUD for `ProductDiscoveryQuery` plus versioned snapshots on update. All reads
 * are scoped by `workspaceId` (default `DEFAULT_WORKSPACE_ID`).
 */
import { withWorkspaceTransaction } from "@/lib/db/workspace-transaction";
import { Prisma } from "@/generated/prisma/client";
import { Decimal, type DecimalValue } from "@/lib/shared/decimal";
import { DEFAULT_WORKSPACE_ID } from "@/lib/config/workspace";
import { writeAuditLog } from "@/lib/audit/log";
import {
  DISCOVERY_QUERY_STATUS_TO_PRISMA,
  type DiscoveryQueryStatus,
} from "@/features/products/domain/types";

export interface ProductDiscoveryQueryInput {
  name: string;
  nicheId?: string | null;
  keywords?: string[];
  excludedKeywords?: string[];
  categoryIds?: string[];
  excludedCategoryIds?: string[];
  targetCountryCodes?: string[];
  languageCodes?: string[];
  minimumPrice?: DecimalValue | null;
  maximumPrice?: DecimalValue | null;
  currency?: string | null;
  minimumCommissionRate?: DecimalValue | null;
  minimumCommissionAmount?: DecimalValue | null;
  minimumRating?: DecimalValue | null;
  minimumRatingCount?: number | null;
  requireInStock?: boolean;
  providerIds?: string[];
  status?: DiscoveryQueryStatus;
}

function toCreateData(
  input: ProductDiscoveryQueryInput,
  workspaceId: string,
): Prisma.ProductDiscoveryQueryUncheckedCreateInput {
  return {
    workspaceId,
    name: input.name,
    nicheId: input.nicheId ?? null,
    keywords: input.keywords ?? [],
    excludedKeywords: input.excludedKeywords ?? [],
    categoryIds: input.categoryIds ?? [],
    excludedCategoryIds: input.excludedCategoryIds ?? [],
    targetCountryCodes: input.targetCountryCodes ?? [],
    languageCodes: input.languageCodes ?? [],
    minimumPrice: input.minimumPrice ? new Decimal(input.minimumPrice) : null,
    maximumPrice: input.maximumPrice ? new Decimal(input.maximumPrice) : null,
    currency: input.currency ?? null,
    minimumCommissionRate: input.minimumCommissionRate ? new Decimal(input.minimumCommissionRate) : null,
    minimumCommissionAmount: input.minimumCommissionAmount
      ? new Decimal(input.minimumCommissionAmount)
      : null,
    minimumRating: input.minimumRating ? new Decimal(input.minimumRating) : null,
    minimumRatingCount: input.minimumRatingCount ?? null,
    requireInStock: input.requireInStock ?? false,
    providerIds: input.providerIds ?? [],
    status: input.status
      ? DISCOVERY_QUERY_STATUS_TO_PRISMA[input.status]
      : "DRAFT",
    currentVersion: 1,
  };
}

export async function listQueries(
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<unknown[]> {
  return withWorkspaceTransaction(workspaceId, (tx) => tx.productDiscoveryQuery.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  }));
}

export async function getQuery(
  id: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<unknown | null> {
  return withWorkspaceTransaction(workspaceId, (tx) => tx.productDiscoveryQuery.findFirst({
    where: { id, workspaceId },
    include: { versions: { orderBy: { version: "desc" } }, runs: { orderBy: { createdAt: "desc" } } },
  }));
}

export async function createQuery(
  input: ProductDiscoveryQueryInput,
  actor: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<unknown> {
  const query = await withWorkspaceTransaction(workspaceId, async (tx) => { const query = await tx.productDiscoveryQuery.create({
    data: toCreateData(input, workspaceId),
  });

    await tx.productDiscoveryQueryVersion.create({
    data: {
      workspaceId,
      queryId: query.id,
      version: 1,
      querySnapshot: input as unknown as Prisma.InputJsonValue,
    },
  });
    return query;
  });

  void writeAuditLog({
    action: "product.query.create",
    entityType: "ProductDiscoveryQuery",
    entityId: query.id,
    metadata: { name: input.name } as Prisma.InputJsonValue,
    actor,
  });

  return query;
}

export async function updateQuery(
  id: string,
  input: ProductDiscoveryQueryInput,
  actor: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<unknown> {
  const query = await withWorkspaceTransaction(workspaceId, async (tx) => {
    const existing = await tx.productDiscoveryQuery.findFirst({
      where: { id, workspaceId },
      select: { currentVersion: true },
    });
    if (!existing) throw new Error(`ProductDiscoveryQuery not found: ${id}`);

    const nextVersion = existing.currentVersion + 1;
    const updated = await tx.productDiscoveryQuery.update({
      where: { id },
      data: {
        ...toCreateData(input, workspaceId),
        id,
        currentVersion: nextVersion,
      },
    });

    await tx.productDiscoveryQueryVersion.create({
      data: {
        workspaceId,
        queryId: id,
        version: nextVersion,
        querySnapshot: input as unknown as Prisma.InputJsonValue,
      },
    });

    return updated;
  });

  void writeAuditLog({
    action: "product.query.update",
    entityType: "ProductDiscoveryQuery",
    entityId: id,
    metadata: { version: query.currentVersion } as Prisma.InputJsonValue,
    actor,
  });

  return query;
}

export async function listRuns(
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<unknown[]> {
  return withWorkspaceTransaction(workspaceId, (tx) => tx.productDiscoveryRun.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: { providerRuns: true },
  }));
}

export async function getRun(
  id: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<unknown | null> {
  return withWorkspaceTransaction(workspaceId, (tx) => tx.productDiscoveryRun.findFirst({
    where: { id, workspaceId },
    include: { providerRuns: true, query: true },
  }));
}
