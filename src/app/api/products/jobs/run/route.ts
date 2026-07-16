import { authorizeWorkerRequest } from "@/lib/api/worker-auth";
import { resolveWorkspaceId, InvalidTenantTokenError } from "@/lib/auth/tenant";
import { ok, serverError, unauthorized } from "@/lib/api/response";
import { runAll } from "@/features/products/application/research-job";

async function runProductResearch(request: Request, allowUserFallback: boolean) {
  const auth = await authorizeWorkerRequest(request, { allowUserFallback });
  if ("response" in auth) return auth.response;
  try {
    const workspaceId = await resolveWorkspaceId();
    const summary = await runAll(auth.actor, crypto.randomUUID());
    return ok({ summary, workspaceId });
  } catch (error) {
    if (error instanceof InvalidTenantTokenError) {
      return unauthorized("Ungültiges Tenant-Token.");
    }
    const message = error instanceof Error ? error.message : "Phase-7-Job fehlgeschlagen.";
    return serverError(message);
  }
}

export async function POST(request: Request) {
  return runProductResearch(request, true);
}

export async function GET(request: Request) {
  return runProductResearch(request, false);
}
