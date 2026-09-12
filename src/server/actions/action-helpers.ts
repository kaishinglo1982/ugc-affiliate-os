import "server-only";
import type { ZodType } from "zod";
import type { User } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { writeAuditLog } from "@/lib/audit/log";
import { fail, ok, newRequestId, type Result } from "@/types/result";

interface MutationOptions<TInput, TOutput> {
  schema: ZodType<TInput>;
  input: unknown;
  auditAction: string;
  entityType: string;
  entityId?: (output: TOutput) => string | undefined;
  handler: (
    input: TInput,
    user: User,
    workspaceId: string,
  ) => Promise<TOutput>;
}

export async function runMutation<TInput, TOutput>(
  options: MutationOptions<TInput, TOutput>,
): Promise<Result<TOutput>> {
  const requestId = newRequestId();

  const user = await getCurrentUser();
  if (!user) {
    return fail("Nicht authentifiziert.", requestId);
  }

  const parsed = options.schema.safeParse(options.input);
  if (!parsed.success) {
    return fail(
      "Eingabe ungültig.",
      requestId,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  try {
    const workspaceId = await resolveWorkspaceId();
    const output = await options.handler(parsed.data, user, workspaceId);
    await writeAuditLog({
      action: options.auditAction,
      entityType: options.entityType,
      entityId: options.entityId?.(output),
      requestId,
      actor: user.email,
      workspaceId,
    });
    return ok(output, requestId);
  } catch (error) {
    console.error(`[action:${options.auditAction}]`, error);
    return fail("Aktion fehlgeschlagen. Bitte versuche es erneut.", requestId);
  }
}
