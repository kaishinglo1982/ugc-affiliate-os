import { authorizeWorkerRequest } from "@/lib/api/worker-auth";
import { resolveWorkspaceId, InvalidTenantTokenError } from "@/lib/auth/tenant";
import { ok, serverError, unauthorized } from "@/lib/api/response";
import { processPublishQueue } from "@/features/publishing/queue";

/**
 * Trigger endpoint for the publish worker. Intended to be called by a scheduler
 * (cron / queue worker) and protected by WORKER_SECRET when set. In development
 * (no secret configured) it falls back to the signed-in-owner guard so the
 * pipeline can be exercised from the dashboard without external infrastructure.
 *
 * Migration (Band 10): worker auth stays via `authorizeWorkerRequest` (secret-
 * gated, not session-gated), so `withApiContext` is intentionally not used —
 * it would require a user session and break scheduler invocations. Tenant
 * isolation is layered through `resolveWorkspaceId`, and responses use the
 * unified envelope from `response.ts`.
 */
async function runPublishWorker(request: Request, allowUserFallback: boolean) {
  const auth = await authorizeWorkerRequest(request, { allowUserFallback });
  if ("response" in auth) return auth.response;
  try {
    const workspaceId = await resolveWorkspaceId();
    const report = await processPublishQueue(10, workspaceId);
    return ok({ report, workspaceId });
  } catch (error) {
    if (error instanceof InvalidTenantTokenError) {
      return unauthorized("Ungültiges Tenant-Token.");
    }
    const message = error instanceof Error ? error.message : "Worker fehlgeschlagen.";
    return serverError(message);
  }
}

export async function POST(request: Request) {
  return runPublishWorker(request, true);
}

export async function GET(request: Request) {
  return runPublishWorker(request, false);
}
