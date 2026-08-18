import { z } from "zod";
import { ok, validateValue, withApiContext } from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { listAffiliatePrograms } from "@/server/services/affiliate";

export const dynamic = "force-dynamic";

const listSchema = z.object({
  provider: z.enum([
    "AMAZON_ASSOCIATES",
    "EBAY_PARTNER_NETWORK",
    "AWIN",
    "CJ_AFFILIATE",
    "IMPACT",
    "RAKUTEN_ADVERTISING",
    "SHAREASALE",
    "DIGISTORE24",
    "ADCELL",
    "CUSTOM",
  ]).optional(),
  status: z.string().trim().min(1).max(50).optional(),
});

export async function GET(request: Request) {
  const auth = await withApiContext(Permission.VIEW_AFFILIATE_PROGRAMS);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const validated = validateValue(
    {
      provider: searchParams.get("provider") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    },
    listSchema,
  );
  if ("response" in validated) return validated.response;

  const programs = await listAffiliatePrograms(
    auth.context.workspaceId,
    validated.data,
  );

  return ok({ programs });
}
