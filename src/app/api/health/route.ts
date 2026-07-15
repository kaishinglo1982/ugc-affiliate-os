import { NextResponse } from "next/server";
import { validateEnv } from "@/lib/config/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const envResult = validateEnv();
  return NextResponse.json({
    status: "ok",
    service: "ugc-affiliate-os",
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV ?? "development",
    config: {
      envValid: envResult.ok,
      missing: envResult.missing,
      warnings: envResult.warnings,
    },
  });
}
