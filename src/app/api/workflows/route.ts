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
  createWorkflow,
  listWorkflows,
} from "@/server/services/workflows";

export const dynamic = "force-dynamic";

const workflowStatusSchema = z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]);

const listSchema = z.object({
  status: workflowStatusSchema.optional(),
});

const stepSchema = z.object({
  type: z.enum(["AGENT", "TOOL", "APPROVAL", "CONDITION"]),
  name: z.string().trim().min(1).max(200),
  config: z.unknown().optional(),
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  trigger: z.string().trim().min(1).max(50).optional(),
  scheduleCron: z.string().trim().min(1).max(100).optional(),
  enabled: z.boolean().optional(),
  ownerId: z.string().trim().min(1).max(200).optional(),
  config: z.unknown().optional(),
  steps: z.array(stepSchema).max(100).optional(),
});

export async function GET(request: Request) {
  const auth = await withApiContext(Permission.VIEW_WORKFLOWS);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const validated = validateValue(
    { status: searchParams.get("status") ?? undefined },
    listSchema,
  );
  if ("response" in validated) return validated.response;

  const workflows = await listWorkflows(
    auth.context.workspaceId,
    validated.data,
  );

  return ok({ workflows });
}

export async function POST(request: Request) {
  const auth = await withApiContext(Permission.MANAGE_WORKFLOWS);
  if ("response" in auth) return auth.response;

  const validated = await parseBody(request, createSchema);
  if ("response" in validated) return validated.response;

  const workflow = await createWorkflow(
    auth.context.workspaceId,
    validated.data,
  );

  await writeAuditLog({
    action: "workflow.create",
    entityType: "WorkflowDefinition",
    entityId: workflow.id,
    actor: auth.context.actor,
  });

  return created({ workflow });
}
