import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";

/**
 * Fail closed until product exports resolve the caller's authorized workspace.
 * Product has a workspaceId column, but this endpoint currently has no trusted
 * user-to-workspace resolver; exporting all rows is unsafe for multi-tenant use.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  return NextResponse.json(
    {
      error: "Produkteexport vorübergehend deaktiviert.",
      code: "TENANT_ISOLATION_REQUIRED",
    },
    { status: 503 },
  );
}
