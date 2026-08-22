import { created, parseBody, withApiContext } from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit/log";
import { providerUsageSchema } from "@/lib/validation/provider-gateway";
import { recordProviderUsage } from "@/server/services/provider-gateway";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await withApiContext(Permission.ROUTE_PROVIDER_GATEWAY);
  if ("response" in auth) return auth.response;

  const parsed = await parseBody(request, providerUsageSchema);
  if ("response" in parsed) return parsed.response;

  try {
    const usage = await recordProviderUsage(
      auth.context.workspaceId,
      parsed.data,
    );
    await writeAuditLog({
      action: "provider_gateway.usage_record",
      entityType: "ProviderUsageRecord",
      entityId: usage.id,
      actor: auth.context.actor,
      workspaceId: auth.context.workspaceId,
      metadata: {
        providerKey: usage.providerKey,
        capability: usage.capability,
        success: usage.success,
        estimatedCost: usage.estimatedCost.toString(),
      },
    });
    return created({ usage });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "PROVIDER_CONNECTION_NOT_FOUND"
    ) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
