import { z } from "zod";
import { ok, parseBody, withApiContext } from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit/log";
import {
  goLiveGateSchema,
  killSwitchSchema,
} from "@/lib/validation/phase23-30";
import {
  activateKillSwitch,
  evaluateGoLiveReadiness,
  setGoLiveGate,
} from "@/server/services/phase23-30";

const commandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set_gate"), payload: goLiveGateSchema }),
  z.object({ action: z.literal("activate_kill_switch"), payload: killSwitchSchema }),
]);

export async function GET() {
  const auth = await withApiContext(Permission.VIEW_WORKSPACE);
  if ("response" in auth) return auth.response;
  return ok({
    readiness: await evaluateGoLiveReadiness(auth.context.workspaceId),
  });
}

export async function POST(request: Request) {
  const auth = await withApiContext(Permission.MANAGE_WORKSPACE);
  if ("response" in auth) return auth.response;
  const parsed = await parseBody(request, commandSchema);
  if ("response" in parsed) return parsed.response;

  if (parsed.data.action === "set_gate") {
    const gate = await setGoLiveGate(
      auth.context.workspaceId,
      auth.context.actor,
      parsed.data.payload,
    );
    await writeAuditLog({
      action: "go_live.gate_set",
      entityType: "GoLiveGate",
      entityId: gate.id,
      actor: auth.context.actor,
      workspaceId: auth.context.workspaceId,
      metadata: { gateKey: gate.gateKey, status: gate.status },
    });
    return ok({ gate });
  }

  const killSwitch = await activateKillSwitch(
    auth.context.workspaceId,
    auth.context.actor,
    parsed.data.payload,
  );
  await writeAuditLog({
    action: "operations.kill_switch_activate",
    entityType: "OperationalKillSwitch",
    entityId: killSwitch.id,
    actor: auth.context.actor,
    workspaceId: auth.context.workspaceId,
    metadata: {
      scopeType: killSwitch.scopeType,
      scopeId: killSwitch.scopeId,
    },
  });
  return ok({ killSwitch });
}
