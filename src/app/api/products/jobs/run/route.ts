import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { runAll } from "@/features/products/application/research-job";

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
    const summary = await runAll(actor, crypto.randomUUID());
    return NextResponse.json({ summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Phase-7-Job fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
