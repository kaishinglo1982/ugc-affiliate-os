import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { env } from "@/lib/config/env";

export async function authorizeWorkerRequest(
  request: Request,
  options: { allowUserFallback: boolean } = { allowUserFallback: false },
): Promise<{ actor: string } | { response: NextResponse }> {
  const secrets = [process.env.WORKER_SECRET, process.env.CRON_SECRET].filter(
    (value): value is string => Boolean(value && value.trim().length > 0),
  );
  if (secrets.length > 0) {
    const auth = request.headers.get("authorization");
    if (!secrets.some((secret) => auth === `Bearer ${secret}`)) {
      return { response: NextResponse.json({ error: "Ungültiges Worker-Token." }, { status: 401 }) };
    }
    return { actor: "worker" };
  }

  // Never fall back to session auth in production: this endpoint is meant to be
  // secret-gated for schedulers, and any signed-in user could otherwise trigger
  // it if WORKER_SECRET/CRON_SECRET was simply forgotten at deploy time.
  if (!options.allowUserFallback || env.isProduction) {
    return { response: NextResponse.json({ error: "Worker-Secret nicht konfiguriert." }, { status: 401 }) };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { response: NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 }) };
  }
  return { actor: user.id ?? "owner" };
}
