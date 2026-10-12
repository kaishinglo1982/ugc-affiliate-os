import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";

/**
 * Fail closed until Revenue and Expense have a verified tenant/workspace
 * ownership path. The current Prisma models do not carry tenantId/workspaceId,
 * so exporting these tables globally would expose cross-customer financial data.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  return NextResponse.json(
    {
      error: "Finanzexport vorübergehend deaktiviert.",
      code: "TENANT_ISOLATION_REQUIRED",
    },
    { status: 503 },
  );
}
