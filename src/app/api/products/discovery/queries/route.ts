import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import {
  listQueries,
  createQuery,
  type ProductDiscoveryQueryInput,
} from "@/features/products/application/query-service";

const createSchema = z.object({
  name: z.string().min(1),
  nicheId: z.string().uuid().nullable().optional(),
  keywords: z.array(z.string()).default([]),
  excludedKeywords: z.array(z.string()).default([]),
  categoryIds: z.array(z.string()).default([]),
  excludedCategoryIds: z.array(z.string()).default([]),
  targetCountryCodes: z.array(z.string()).default([]),
  languageCodes: z.array(z.string()).default([]),
  minimumPrice: z.number().nullable().optional(),
  maximumPrice: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  minimumCommissionRate: z.number().nullable().optional(),
  minimumCommissionAmount: z.number().nullable().optional(),
  minimumRating: z.number().nullable().optional(),
  minimumRatingCount: z.number().int().nullable().optional(),
  requireInStock: z.boolean().optional(),
  providerIds: z.array(z.string()).default([]),
  status: z.enum(["draft", "active", "paused", "archived"]).optional(),
});

export async function GET(_request: Request) {
  const guard = await requireApiPermission("product_discovery.read");
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

  const queries = await listQueries(workspaceId);
  return NextResponse.json({ queries });
}

export async function POST(request: Request) {
  const guard = await requireApiPermission("product_discovery.create");
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

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();
  const actor = user?.id ?? "owner";

  const input = parsed.data as ProductDiscoveryQueryInput;
  try {
    const query = (await createQuery(input, actor, workspaceId)) as { id: string };
    await writeAuditLog({
      action: "product_discovery.create",
      entityType: "ProductDiscoveryQuery",
      entityId: query.id,
      metadata: { name: input.name } as never,
      actor,
    });
    return NextResponse.json({ query }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Anlage fehlgeschlagen." },
      { status: 400 },
    );
  }
}
