import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";

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

  if (!options.allowUserFallback) {
    return { response: NextResponse.json({ error: "Worker-Secret nicht konfiguriert." }, { status: 401 }) };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { response: NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 }) };
  }
  return { actor: user.id ?? "owner" };
}
