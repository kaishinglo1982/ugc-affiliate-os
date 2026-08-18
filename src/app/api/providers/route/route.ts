import { ok, parseBody, withApiContext } from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit/log";
import { providerRouteRequestSchema } from "@/lib/validation/provider-gateway";
import { selectProvider } from "@/server/services/provider-gateway";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await withApiContext(Permission.ROUTE_PROVIDER_GATEWAY);
  if ("response" in auth) return auth.response;

  const parsed = await parseBody(request, providerRouteRequestSchema);
  if ("response" in parsed) return parsed.response;

  try {
    const decision = await selectProvider(
      auth.context.workspaceId,
      parsed.data.capability,
      parsed.data.candidates,
    );
    await writeAuditLog({
      action: "provider_gateway.route",
      entityType: "ProviderRoutingPolicy",
      entityId: decision.policyId,
      actor: auth.context.actor,
      workspaceId: auth.context.workspaceId,
      metadata: {
        providerKey: decision.providerKey,
        modelKey: decision.modelKey,
        strategy: decision.strategy,
        requiresApproval: decision.requiresApproval,
      },
    });
    return ok({ decision });
  } catch (error) {
    const code = error instanceof Error ? error.message : "ROUTING_FAILED";
    const status = code === "PROVIDER_POLICY_NOT_FOUND" ? 404 : 409;
    return Response.json({ error: code }, { status });
  }
}
