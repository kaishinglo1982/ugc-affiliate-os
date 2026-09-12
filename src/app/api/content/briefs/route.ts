import { z } from "zod";
import {
  created,
  notFound,
  ok,
  parseBody,
  validateValue,
  withApiContext,
} from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit/log";
import {
  createContentBrief,
  listContentBriefs,
} from "@/server/services/content";

export const dynamic = "force-dynamic";

const briefStatusSchema = z.enum([
  "DRAFT",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "SUPERSEDED",
  "ARCHIVED",
]);

const listSchema = z.object({
  campaignId: z.string().uuid().optional(),
  status: briefStatusSchema.optional(),
});

const createSchema = z.object({
  campaignId: z.string().uuid().optional(),
  objective: z.string().trim().min(1).max(500),
  targetAudience: z.string().max(500).optional(),
  platform: z.string().trim().min(1).max(100).optional(),
  hookAngle: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
});

export async function GET(request: Request) {
  const auth = await withApiContext(Permission.VIEW_CONTENT_BRIEFS);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const validated = validateValue(
    {
      campaignId: searchParams.get("campaignId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    },
    listSchema,
  );
  if ("response" in validated) return validated.response;

  const briefs = await listContentBriefs(
    auth.context.workspaceId,
    validated.data,
  );

  return ok({ briefs });
}

export async function POST(request: Request) {
  const auth = await withApiContext(Permission.MANAGE_CONTENT_BRIEFS);
  if ("response" in auth) return auth.response;

  const validated = await parseBody(request, createSchema);
  if ("response" in validated) return validated.response;

  try {
    const brief = await createContentBrief(auth.context.workspaceId, {
      ...validated.data,
      createdBy: auth.context.actor,
    });

    await writeAuditLog({
      action: "content_brief.create",
      entityType: "ContentBrief",
      entityId: brief.id,
      actor: auth.context.actor,
    });

    return created({ brief });
  } catch (error) {
    if (error instanceof Error && error.message === "CAMPAIGN_NOT_FOUND") {
      return notFound("Kampagne nicht gefunden.");
    }
    throw error;
  }
}
