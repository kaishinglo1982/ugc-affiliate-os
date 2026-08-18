import { ok, withApiContext } from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { getBusinessPortfolio } from "@/server/services/business-portfolio";

export async function GET() {
  const auth = await withApiContext(Permission.VIEW_WORKSPACE);
  if ("response" in auth) return auth.response;

  return ok({
    portfolio: await getBusinessPortfolio(auth.context.workspaceId),
  });
}
