import {
  created,
  ok,
  parseBody,
  validateValue,
  withApiContext,
} from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit/log";
import {
  providerRoutingPolicySchema,
  providerRoutingQuerySchema,
} from "@/lib/validation/provider-gateway";
import {
  createProviderPolicy,
  listProviderPolicies,
} from "@/server/services/provider-gateway";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await withApiContext(Permission.VIEW_PROVIDER_GATEWAY);
  if ("response" in auth) return auth.response;

  const params = new URL(request.url).searchParams;
  const parsed = validateValue(
    {
      capability: params.get("capability") ?? undefined,
      enabled: params.get("enabled") ?? undefined,
    },
    providerRoutingQuerySchema,
  );
  if ("response" in parsed) return parsed.response;

  const policies = await listProviderPolicies(
    auth.context.workspaceId,
    parsed.data,
  );
  return ok({ policies });
}

export async function POST(request: Request) {
  const auth = await withApiContext(Permission.MANAGE_PROVIDER_GATEWAY);
  if ("response" in auth) return auth.response;

  const parsed = await parseBody(request, providerRoutingPolicySchema);
  if ("response" in parsed) return parsed.response;

  try {
    const policy = await createProviderPolicy(
      auth.context.workspaceId,
      parsed.data,
    );
    await writeAuditLog({
      action: "provider_gateway.policy_create",
      entityType: "ProviderRoutingPolicy",
      entityId: policy.id,
      actor: auth.context.actor,
      workspaceId: auth.context.workspaceId,
      metadata: {
        capability: policy.capability,
        strategy: policy.strategy,
      },
    });
    return created({ policy });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "PROVIDER_POLICY_CONFLICT"
    ) {
      return Response.json(
        { error: "Provider kann nicht gleichzeitig erlaubt und gesperrt sein." },
        { status: 409 },
      );
    }
    throw error;
  }
}
