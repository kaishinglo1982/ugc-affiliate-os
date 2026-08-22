import { z } from "zod";
import { ok, parseBody, withApiContext } from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit/log";
import {
  creatorDeliverableReviewSchema,
  creatorDeliverableSchema,
} from "@/lib/validation/phase23-30";
import {
  reviewCreatorDeliverable,
  submitCreatorDeliverable,
} from "@/server/services/phase23-30";

const commandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("submit"), payload: creatorDeliverableSchema }),
  z.object({ action: z.literal("review"), payload: creatorDeliverableReviewSchema }),
]);

export async function POST(request: Request) {
  const auth = await withApiContext(Permission.MANAGE_WORKSPACE);
  if ("response" in auth) return auth.response;
  const parsed = await parseBody(request, commandSchema);
  if ("response" in parsed) return parsed.response;

  try {
    const deliverable =
      parsed.data.action === "submit"
        ? await submitCreatorDeliverable(auth.context.workspaceId, parsed.data.payload)
        : await reviewCreatorDeliverable(auth.context.workspaceId, parsed.data.payload);
    await writeAuditLog({
      action: `creator_deliverable.${parsed.data.action}`,
      entityType: "CreatorDeliverable",
      entityId: deliverable.id,
      actor: auth.context.actor,
      workspaceId: auth.context.workspaceId,
      metadata: { status: deliverable.status },
    });
    return ok({ deliverable });
  } catch (error) {
    const code = error instanceof Error ? error.message : "DELIVERABLE_COMMAND_FAILED";
    const known = ["ENGAGEMENT_NOT_FOUND", "MEDIA_ASSET_NOT_FOUND", "DELIVERABLE_NOT_FOUND"];
    return Response.json({ error: code }, { status: known.includes(code) ? 404 : 409 });
  }
}
