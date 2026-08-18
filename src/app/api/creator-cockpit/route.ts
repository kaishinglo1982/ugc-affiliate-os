import { ok, withApiContext } from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { getCreatorCockpit } from "@/server/services/creator-cockpit";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await withApiContext(Permission.VIEW_WORKSPACE);
  if ("response" in auth) return auth.response;

  const cockpit = await getCreatorCockpit(auth.context.workspaceId);
  return ok({ cockpit });
}
