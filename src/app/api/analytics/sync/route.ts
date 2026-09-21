import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { requestSyncJob, processSyncQueue } from "@/features/analytics/sync";

const syncRequestSchema = z.object({
  jobType: z.enum(["ACCOUNT_SYNC", "POST_SYNC", "POST_BACKFILL"]),
  socialAccountId: z.string().uuid().optional(),
  externalPostId: z.string().optional(),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  process: z.boolean().optional(),
});

export async function POST(request: Request) {
  const guard = await requireApiPermission(Permission.MANAGE_ANALYTICS_SYNC);
  if (guard) return guard.response;

  let workspaceId: string;
  try {
    workspaceId = await resolveWorkspaceId();
  } catch (e) {
    if (e instanceof InvalidTenantTokenError) {
      return NextResponse.json({ error: "Ungültiges Tenant-Token." }, { status: 401 });
    }
    throw e;
  }

  const body = await request.json().catch(() => null);
  const parsed = syncRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Anfrage.", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const input = parsed.data;

  const job = await requestSyncJob({
    workspaceId: workspaceId,
    jobType: input.jobType,
    socialAccountId: input.socialAccountId,
    externalPostId: input.externalPostId,
    periodStart: input.periodStart ? new Date(input.periodStart) : undefined,
    periodEnd: input.periodEnd ? new Date(input.periodEnd) : undefined,
  });

  let report = null;
  if (input.process && input.jobType !== "POST_BACKFILL") {
    report = await processSyncQueue(5, workspaceId);
  }

  return NextResponse.json({ jobId: job.id, report });
}
