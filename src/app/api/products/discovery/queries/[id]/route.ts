import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import {
  getQuery,
  updateQuery,
  type ProductDiscoveryQueryInput,
} from "@/features/products/application/query-service";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  nicheId: z.string().uuid().nullable().optional(),
  keywords: z.array(z.string()).optional(),
  excludedKeywords: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
  excludedCategoryIds: z.array(z.string()).optional(),
  targetCountryCodes: z.array(z.string()).optional(),
  languageCodes: z.array(z.string()).optional(),
  minimumPrice: z.number().nullable().optional(),
  maximumPrice: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  minimumCommissionRate: z.number().nullable().optional(),
  minimumCommissionAmount: z.number().nullable().optional(),
  minimumRating: z.number().nullable().optional(),
  minimumRatingCount: z.number().int().nullable().optional(),
  requireInStock: z.boolean().optional(),
  providerIds: z.array(z.string()).optional(),
  status: z.enum(["draft", "active", "paused", "archived"]).optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;
  const query = await getQuery(id, workspaceId);
  if (!query) return NextResponse.json({ error: "Abfrage nicht gefunden." }, { status: 404 });
  return NextResponse.json({ query });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiPermission("product_discovery.manage");
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

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();
  const actor = user?.id ?? "owner";

  const existing = await getQuery(id, workspaceId);
  if (!existing) return NextResponse.json({ error: "Abfrage nicht gefunden." }, { status: 404 });

  const input = parsed.data as ProductDiscoveryQueryInput;
  try {
    const updated = await updateQuery(id, input, actor, workspaceId);
    await writeAuditLog({
      action: "product_discovery.update",
      entityType: "ProductDiscoveryQuery",
      entityId: id,
      actor,
    });
    return NextResponse.json({ query: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Aktualisierung fehlgeschlagen." },
      { status: 400 },
    );
  }
}
