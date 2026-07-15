"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ok, fail, newRequestId, type Result } from "@/types/result";
import { idSchema } from "@/lib/validation/publishing";
import {
  approvePost,
  enqueuePublish,
  processPublishQueue,
  retryDeadLetterJob,
  PublishError,
  type PublishWorkerReport,
} from "@/features/publishing/queue";

export async function approvePostAction(id: string): Promise<Result<{ id: string; status: string }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const parsed = idSchema.safeParse({ id });
  if (!parsed.success) return fail("Ungültige ID.", requestId);

  try {
    const post = await approvePost(parsed.data.id, user.email);
    revalidatePath("/app/publishing");
    revalidatePath("/app/calendar");
    return ok({ id: post.id, status: post.status }, requestId);
  } catch (error) {
    return fail(error instanceof PublishError ? error.message : "Freigabe fehlgeschlagen.", requestId);
  }
}

export async function enqueuePublishAction(id: string): Promise<Result<{ id: string; status: string }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const parsed = idSchema.safeParse({ id });
  if (!parsed.success) return fail("Ungültige ID.", requestId);

  try {
    const post = await enqueuePublish(parsed.data.id, user.email);
    revalidatePath("/app/publishing");
    revalidatePath("/app/calendar");
    return ok({ id: post.id, status: post.status }, requestId);
  } catch (error) {
    return fail(error instanceof PublishError ? error.message : "Einreihen fehlgeschlagen.", requestId);
  }
}

export async function runPublishWorkerAction(): Promise<Result<PublishWorkerReport>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  try {
    const report = await processPublishQueue();
    revalidatePath("/app/publishing");
    revalidatePath("/app/calendar");
    return ok(report, requestId);
  } catch (error) {
    return fail(error instanceof PublishError ? error.message : "Worker fehlgeschlagen.", requestId);
  }
}

export async function retryDeadLetterAction(jobId: string): Promise<Result<{ id: string }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const parsed = idSchema.safeParse({ id: jobId });
  if (!parsed.success) return fail("Ungültige ID.", requestId);

  try {
    await retryDeadLetterJob(parsed.data.id, user.email);
    revalidatePath("/app/publishing");
    revalidatePath("/app/calendar");
    return ok({ id: parsed.data.id }, requestId);
  } catch (error) {
    return fail(error instanceof PublishError ? error.message : "Wiederholung fehlgeschlagen.", requestId);
  }
}
