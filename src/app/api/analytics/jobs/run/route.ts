import { authorizeWorkerRequest } from "@/lib/api/worker-auth";
import { resolveWorkspaceId, InvalidTenantTokenError } from "@/lib/auth/tenant";
import { ok, serverError, unauthorized } from "@/lib/api/response";
import { runAggregation } from "@/features/analytics/aggregation-job";
import { runAnomalyDetection } from "@/features/analytics/anomaly-job";
import { runDataQualityScan } from "@/features/analytics/data-quality-job";

/**
 * Phase-6 automation runner. Intended to be invoked by an external scheduler
 * (system cron / Vercel Cron / queue worker). Protected by WORKER_SECRET when
 * set; in development it falls back to the signed-in-owner guard so the scans
 * can be exercised without external infrastructure. Aggregates raw events into
 * performance snapshots first, then runs anomaly detection and the data-quality
 * scan. None of these auto-blocks or auto-applies anything.
 *
 * Migration (Band 10): worker auth stays via `authorizeWorkerRequest` because
 * this endpoint is secret-gated, not session-gated — `withApiContext` would
 * require a user session and break scheduler invocations. Tenant isolation is
 * layered through `resolveWorkspaceId` (the same primitive `withApiContext`
 * uses) so a CarryOS-routed request still resolves its workspace. Responses
 * use the unified envelope from `response.ts`.
 */
async function runPhase6Jobs(request: Request, allowUserFallback: boolean) {
  const auth = await authorizeWorkerRequest(request, { allowUserFallback });
  if ("response" in auth) return auth.response;
  try {
    const workspaceId = await resolveWorkspaceId();
    const aggregation = await runAggregation(auth.actor);
    const [anomalies, quality] = await Promise.all([runAnomalyDetection(auth.actor), runDataQualityScan(auth.actor)]);
    return ok({ aggregation, anomalies, quality, workspaceId });
  } catch (error) {
    if (error instanceof InvalidTenantTokenError) {
      return unauthorized("Ungültiges Tenant-Token.");
    }
    const message = error instanceof Error ? error.message : "Phase-6-Job fehlgeschlagen.";
    return serverError(message);
  }
}

export async function POST(request: Request) {
  return runPhase6Jobs(request, true);
}

export async function GET(request: Request) {
  return runPhase6Jobs(request, false);
}
