import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
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
 */
export async function POST(request: Request) {
  const secret = process.env.WORKER_SECRET;
  let actor = "owner";
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Ungültiges Worker-Token." }, { status: 401 });
    }
  } else {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
    }
    actor = user.id ?? "owner";
  }

  try {
    const aggregation = await runAggregation(actor);
    const [anomalies, quality] = await Promise.all([runAnomalyDetection(actor), runDataQualityScan(actor)]);
    return NextResponse.json({ aggregation, anomalies, quality });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Phase-6-Job fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
