import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { writeAuditLog } from "@/lib/audit/log";
import { previewImport } from "@/features/products/application/core";

const schema = z.object({
  content: z.string().min(1),
});

export async function POST(request: Request) {
  const guard = await requireApiPermission("product_imports.preview");
  if (guard) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();
  const actor = user?.id ?? "owner";
  const workspaceId = await resolveWorkspaceId();

  try {
    const preview = await previewImport(parsed.data.content, actor, workspaceId);
    await writeAuditLog({
      action: "product_import.preview",
      entityType: "ProductImportBatch",
      metadata: {
        previewToken: preview.previewToken,
        validRows: preview.validRows,
        invalidRows: preview.invalidRows,
      } as never,
      actor,
    });
    return NextResponse.json({
      previewToken: preview.previewToken,
      validRows: preview.validRows,
      invalidRows: preview.invalidRows,
      warnings: preview.warnings,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Vorschau fehlgeschlagen." },
      { status: 400 },
    );
  }
}
