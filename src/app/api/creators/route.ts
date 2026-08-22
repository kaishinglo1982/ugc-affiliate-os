import { z } from "zod";
import { created, parseBody, withApiContext } from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit/log";
import {
  creatorEngagementSchema,
  creatorProfileSchema,
} from "@/lib/validation/phase23-30";
import {
  createCreatorEngagement,
  createCreatorProfile,
} from "@/server/services/phase23-30";

const commandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create_profile"), payload: creatorProfileSchema }),
  z.object({ action: z.literal("create_engagement"), payload: creatorEngagementSchema }),
]);

export async function POST(request: Request) {
  const auth = await withApiContext(Permission.MANAGE_WORKSPACE);
  if ("response" in auth) return auth.response;
  const parsed = await parseBody(request, commandSchema);
  if ("response" in parsed) return parsed.response;

  try {
    const entity =
      parsed.data.action === "create_profile"
        ? await createCreatorProfile(auth.context.workspaceId, parsed.data.payload)
        : await createCreatorEngagement(auth.context.workspaceId, parsed.data.payload);
    await writeAuditLog({
      action: `creator_marketplace.${parsed.data.action}`,
      entityType:
        parsed.data.action === "create_profile"
          ? "CreatorProfile"
          : "CreatorEngagement",
      entityId: entity.id,
      actor: auth.context.actor,
      workspaceId: auth.context.workspaceId,
    });
    return created({ entity });
  } catch (error) {
    const code = error instanceof Error ? error.message : "CREATOR_COMMAND_FAILED";
    if (code === "CREATOR_NOT_FOUND" || code === "CAMPAIGN_NOT_FOUND") {
      return Response.json({ error: code }, { status: 404 });
    }
    throw error;
  }
}
