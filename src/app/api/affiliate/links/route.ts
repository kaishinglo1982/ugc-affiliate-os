import { z } from "zod";
import { ok, validateValue, withApiContext } from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { listAffiliateLinks } from "@/server/services/affiliate";

export const dynamic = "force-dynamic";

const listSchema = z.object({
  programId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  const auth = await withApiContext(Permission.VIEW_AFFILIATE_LINKS);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const validated = validateValue(
    {
      programId: searchParams.get("programId") ?? undefined,
      productId: searchParams.get("productId") ?? undefined,
    },
    listSchema,
  );
  if ("response" in validated) return validated.response;

  const links = await listAffiliateLinks(
    auth.context.workspaceId,
    validated.data,
  );

  return ok({ links });
}
