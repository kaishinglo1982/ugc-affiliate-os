import { z } from "zod";
import { ok, validateValue, withApiContext } from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { listCampaigns } from "@/server/services/campaigns";

export const dynamic = "force-dynamic";

const listSchema = z.object({
  status: z.enum([
    "DRAFT",
    "RESEARCH",
    "SCRIPTING",
    "PRODUCTION",
    "REVIEW",
    "SCHEDULED",
    "ACTIVE",
    "PAUSED",
    "COMPLETED",
    "ARCHIVED",
  ]).optional(),
  productId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  const auth = await withApiContext(Permission.VIEW_CAMPAIGNS);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const validated = validateValue(
    {
      status: searchParams.get("status") ?? undefined,
      productId: searchParams.get("productId") ?? undefined,
    },
    listSchema,
  );
  if ("response" in validated) return validated.response;

  const campaigns = await listCampaigns(
    auth.context.workspaceId,
    validated.data,
  );

  return ok({ campaigns });
}
