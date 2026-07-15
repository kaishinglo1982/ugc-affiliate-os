import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { processPublishQueue } from "@/features/publishing/queue";

/**
 * Trigger endpoint for the publish worker. Intended to be called by a scheduler
 * (cron / queue worker) and protected by WORKER_SECRET when set. In development
 * (no secret configured) it falls back to the signed-in-owner guard so the
 * pipeline can be exercised from the dashboard without external infrastructure.
 */
export async function POST(request: Request) {
  const secret = process.env.WORKER_SECRET;
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
  }

  try {
    const report = await processPublishQueue();
    return NextResponse.json({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Worker fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
