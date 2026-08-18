import { ok, withApiContext } from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { env } from "@/lib/config/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await withApiContext(Permission.VIEW_WORKSPACE);
  if ("response" in result) return result.response;

  return ok({
    workspace: {
      id: result.context.workspaceId,
      mode: "multi-tenant",
      environment: env.nodeEnv,
      appUrl: env.appUrl() ?? null,
    },
  });
}
