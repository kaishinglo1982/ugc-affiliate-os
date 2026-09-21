import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CarryOSRuntimeAuthorizationError,
  CarryOSRuntimeOperationError,
  executeCarryOSRuntime,
} from "@/lib/carryos/runtime-adapter";
import { InvalidTenantTokenError, TenantWorkspaceBindingError } from "@/lib/auth/tenant";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  operation: z.enum([
    "affiliate.research",
    "affiliate.opportunity.score",
    "affiliate.opportunity.list",
  ]),
  productId: z.string().min(1).optional(),
  correlationId: z.string().min(1).max(200).optional(),
}).strict();

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige CarryOS Runtime-Anfrage." },
      { status: 400 },
    );
  }

  try {
    const result = await executeCarryOSRuntime(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof InvalidTenantTokenError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof TenantWorkspaceBindingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof CarryOSRuntimeAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof CarryOSRuntimeOperationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
