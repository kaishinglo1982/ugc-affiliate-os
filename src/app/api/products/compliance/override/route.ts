import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { overrideCompliance } from "@/features/products/application/core";

const schema = z.object({
  profileId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
});

export async function POST(request: Request) {
  const guard = await requireApiPermission("product_compliance.override");
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
    const profile = await overrideCompliance(
      parsed.data.profileId,
      actor,
      parsed.data.decision,
      parsed.data.reason,
      workspaceId,
    );
    await writeAuditLog({
      action: "product_compliance.override",
      entityType: "ProductComplianceProfile",
      entityId: parsed.data.profileId,
      metadata: { decision: parsed.data.decision, reason: parsed.data.reason ?? null } as never,
      actor,
    });
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Überschreibung fehlgeschlagen." },
      { status: 400 },
    );
  }
}
