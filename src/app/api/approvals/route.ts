import { z } from "zod";
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
  createApprovalRequest,
  listApprovals,
} from "@/server/services/approvals";

export const dynamic = "force-dynamic";

const resourceTypeSchema = z.enum([
  "product",
  "affiliate_offer",
  "product_opportunity",
  "product_campaign_candidate",
  "campaign_candidate",
  "campaign_strategy",
  "creative_angle",
  "creative_brief",
  "content_batch",
  "production_task_override",
  "production_schedule_override",
  "campaign_quality_override",
  "campaign_production",
  "media_production_plan",
  "voice_profile",
  "avatar_profile",
  "consent_record",
  "media_generation_job",
  "render_specification",
  "media_timeline",
  "render_job",
  "subtitle_track",
  "media_asset",
  "media_variant",
  "agent_tool_invocation",
]);

const statusSchema = z.enum(["DRAFT", "PENDING", "APPROVED", "REJECTED"]);

const listSchema = z.object({
  resourceType: resourceTypeSchema.optional(),
  status: statusSchema.optional(),
});

const createSchema = z.object({
  resourceType: resourceTypeSchema,
  resourceId: z.string().trim().min(1).max(200),
  cost: z.number().finite().nonnegative().optional(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).optional(),
  expiresAt: z.string().datetime().transform((value) => new Date(value)).optional(),
  note: z.string().max(2000).optional(),
  payload: z.unknown().optional(),
});

export async function GET(request: Request) {
  const auth = await withApiContext(Permission.VIEW_APPROVALS);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const validated = validateValue(
    {
      resourceType: searchParams.get("resourceType") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    },
    listSchema,
  );
  if ("response" in validated) return validated.response;

  const approvals = await listApprovals(
    auth.context.workspaceId,
    validated.data,
  );

  return ok({ approvals });
}

export async function POST(request: Request) {
  const auth = await withApiContext(Permission.CREATE_APPROVALS);
  if ("response" in auth) return auth.response;

  const validated = await parseBody(request, createSchema);
  if ("response" in validated) return validated.response;

  const approval = await createApprovalRequest(
    {
      ...validated.data,
      requestedBy: auth.context.actor,
    },
    auth.context.workspaceId,
  );

  await writeAuditLog({
    action: "approval.create",
    entityType: "Approval",
    entityId: approval.id,
    actor: auth.context.actor,
  });

  return created({ approval });
}
