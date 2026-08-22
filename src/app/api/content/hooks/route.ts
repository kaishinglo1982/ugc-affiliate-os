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
  createContentHook,
  listContentHooks,
} from "@/server/services/content";

export const dynamic = "force-dynamic";

const hookStatusSchema = z.enum(["IDEA", "DRAFT", "APPROVED", "REJECTED"]);

const listSchema = z.object({
  briefId: z.string().uuid().optional(),
  status: hookStatusSchema.optional(),
});

const createSchema = z.object({
  briefId: z.string().uuid(),
  angle: z.string().trim().min(1).max(300),
  body: z.string().max(5000).optional(),
  score: z.number().finite().min(0).max(10).optional(),
  status: hookStatusSchema.optional(),
});

export async function GET(request: Request) {
  const auth = await withApiContext(Permission.VIEW_CONTENT_BRIEFS);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const validated = validateValue(
    {
      briefId: searchParams.get("briefId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    },
    listSchema,
  );
  if ("response" in validated) return validated.response;

  const hooks = await listContentHooks(
    auth.context.workspaceId,
    validated.data,
  );

  return ok({ hooks });
}

export async function POST(request: Request) {
  const auth = await withApiContext(Permission.MANAGE_CONTENT_BRIEFS);
  if ("response" in auth) return auth.response;

  const validated = await parseBody(request, createSchema);
  if ("response" in validated) return validated.response;

  try {
    const hook = await createContentHook(
      auth.context.workspaceId,
      validated.data,
    );

    await writeAuditLog({
      action: "content_hook.create",
      entityType: "ContentHook",
      entityId: hook.id,
      actor: auth.context.actor,
    });

    return created({ hook });
  } catch (error) {
    if (error instanceof Error && error.message === "CONTENT_BRIEF_NOT_FOUND") {
      return notFound("Content-Brief nicht gefunden.");
    }
    throw error;
  }
}
