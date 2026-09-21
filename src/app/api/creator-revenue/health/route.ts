import { authorizeCreatorRevenueService } from "@/lib/api/creator-revenue-service-auth";
import { ok } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = authorizeCreatorRevenueService(request);
  if (!auth.ok) return auth.response;

  return ok({
    status: "ok",
    service: "ugc-affiliate-os",
    integration: auth.context.clientId,
    workspaceId: auth.context.workspaceId,
    capabilities: ["snapshot", "workflows"],
  });
}
