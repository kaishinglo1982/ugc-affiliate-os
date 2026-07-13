"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { runMutation } from "@/server/actions/action-helpers";
import { productFormSchema, productIdSchema } from "@/lib/validation/products";
import { computeProductScore } from "@/features/products/scoring";
import { parseCsv } from "@/lib/csv";
import { ok, fail, newRequestId, type Result } from "@/types/result";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";

function splitTags(input?: string): string[] {
  if (!input) return [];
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

async function persistProductWithScore(
  productId: string | undefined,
  input: z.infer<typeof productFormSchema>,
) {
  const scoreResult = computeProductScore(input.dimensions);

  const data = {
    name: input.name,
    description: input.description || null,
    vendor: input.vendor || null,
    category: input.category || null,
    tags: splitTags(input.tags),
    targetUrl: input.targetUrl || null,
    imageUrl: input.imageUrl || null,
    price: input.price ?? null,
    commissionRate: input.commissionRate ?? null,
    estimatedMargin:
      input.price && input.commissionRate
        ? Number(((input.price * input.commissionRate) / 100).toFixed(2))
        : null,
    audience: input.audience || null,
    problemSolved: input.problemSolved || null,
    notes: input.notes || null,
    status: input.status,
    trend: input.trend,
    risk: input.risk,
    isFavorite: input.isFavorite ?? false,
  };

  const product = productId
    ? await prisma.product.update({ where: { id: productId }, data })
    : await prisma.product.create({ data });

  await prisma.productScore.create({
    data: {
      productId: product.id,
      ...input.dimensions,
      totalScore: scoreResult.totalScore,
      breakdown: scoreResult.breakdown as unknown as object,
    },
  });

  return product;
}

export async function createProductAction(
  _prevState: Result<{ id: string }> | null,
  formData: FormData,
): Promise<Result<{ id: string }>> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = productFormSchema.safeParse({
    ...raw,
    dimensions: JSON.parse(String(formData.get("dimensions") ?? "{}")),
  });

  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  if (!parsed.success) {
    return fail("Eingabe ungültig.", requestId, parsed.error.flatten().fieldErrors);
  }

  const product = await persistProductWithScore(undefined, parsed.data);

  await writeAuditLog({
    action: "product.create",
    entityType: "Product",
    entityId: product.id,
    requestId,
    actor: user.email,
  });

  revalidatePath("/app/products");
  return ok({ id: product.id }, requestId);
}

export async function updateProductAction(
  productId: string,
  _prevState: Result<{ id: string }> | null,
  formData: FormData,
): Promise<Result<{ id: string }>> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = productFormSchema.safeParse({
    ...raw,
    dimensions: JSON.parse(String(formData.get("dimensions") ?? "{}")),
  });

  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  if (!parsed.success) {
    return fail("Eingabe ungültig.", requestId, parsed.error.flatten().fieldErrors);
  }

  const product = await persistProductWithScore(productId, parsed.data);

  await writeAuditLog({
    action: "product.update",
    entityType: "Product",
    entityId: product.id,
    requestId,
    actor: user.email,
  });

  revalidatePath("/app/products");
  revalidatePath(`/app/products/${productId}`);
  return ok({ id: product.id }, requestId);
}

export async function toggleFavoriteAction(id: string, isFavorite: boolean) {
  const result = await runMutation({
    schema: productIdSchema,
    input: { id },
    auditAction: "product.update",
    entityType: "Product",
    handler: async (input) =>
      prisma.product.update({ where: { id: input.id }, data: { isFavorite } }),
    entityId: (output) => output.id,
  });
  revalidatePath("/app/products");
  return result;
}

export async function archiveProductAction(id: string) {
  const result = await runMutation({
    schema: productIdSchema,
    input: { id },
    auditAction: "product.archive",
    entityType: "Product",
    handler: async (input) =>
      prisma.product.update({
        where: { id: input.id },
        data: { status: "ARCHIVED", archivedAt: new Date() },
      }),
    entityId: (output) => output.id,
  });
  revalidatePath("/app/products");
  return result;
}

export async function deleteProductAction(id: string) {
  const result = await runMutation({
    schema: productIdSchema,
    input: { id },
    auditAction: "product.delete",
    entityType: "Product",
    handler: async (input) => {
      await prisma.product.delete({ where: { id: input.id } });
      return { id: input.id };
    },
    entityId: (output) => output.id,
  });
  revalidatePath("/app/products");
  return result;
}

const importCsvSchema = z.object({ csv: z.string().min(1) });

export async function importProductsCsvAction(
  _prevState: Result<{ imported: number }> | null,
  formData: FormData,
): Promise<Result<{ imported: number }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const parsed = importCsvSchema.safeParse({ csv: formData.get("csv") });
  if (!parsed.success) {
    return fail("Keine gültige CSV-Datei.", requestId);
  }

  const rows = parseCsv(parsed.data.csv);
  if (rows.length < 2) {
    return fail("CSV enthält keine Datenzeilen.", requestId);
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const nameIdx = header.indexOf("name");
  if (nameIdx === -1) {
    return fail('CSV benötigt mindestens eine Spalte "name".', requestId);
  }
  const categoryIdx = header.indexOf("category");
  const vendorIdx = header.indexOf("vendor");
  const priceIdx = header.indexOf("price");
  const commissionIdx = header.indexOf("commissionrate");
  const tagsIdx = header.indexOf("tags");

  let imported = 0;
  for (const row of rows.slice(1)) {
    const name = row[nameIdx]?.trim();
    if (!name) continue;

    const dimensions = {
      demand: 5,
      commission: 5,
      contentPotential: 5,
      competition: 5,
      problemSolvingPower: 5,
      visualDemonstrability: 5,
      platformFit: 5,
      trendMomentum: 5,
      returnRisk: 5,
      complianceRisk: 5,
    };
    const scoreResult = computeProductScore(dimensions);

    const product = await prisma.product.create({
      data: {
        name,
        category: categoryIdx >= 0 ? row[categoryIdx]?.trim() || null : null,
        vendor: vendorIdx >= 0 ? row[vendorIdx]?.trim() || null : null,
        price: priceIdx >= 0 && row[priceIdx] ? Number(row[priceIdx]) : null,
        commissionRate:
          commissionIdx >= 0 && row[commissionIdx] ? Number(row[commissionIdx]) : null,
        tags: tagsIdx >= 0 ? splitTags(row[tagsIdx]) : [],
        status: "IDEA",
        trend: "STABLE",
        risk: "MEDIUM",
      },
    });

    await prisma.productScore.create({
      data: {
        productId: product.id,
        ...dimensions,
        totalScore: scoreResult.totalScore,
        breakdown: scoreResult.breakdown as unknown as object,
      },
    });

    imported += 1;
  }

  await writeAuditLog({
    action: "product.create",
    entityType: "Product",
    requestId,
    actor: user.email,
    metadata: { importedCount: imported, source: "csv" },
  });

  revalidatePath("/app/products");
  return ok({ imported }, requestId);
}
