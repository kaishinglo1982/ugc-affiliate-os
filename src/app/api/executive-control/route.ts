import { z } from "zod";
import { ok, parseBody, withApiContext } from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit/log";
import {
  executiveObjectiveSchema,
  goLiveGateSchema,
  killSwitchSchema,
} from "@/lib/validation/phase23-30";
import {
  activateKillSwitch,
  createExecutiveObjective,
  evaluateGoLiveReadiness,
  releaseKillSwitch,
  setGoLiveGate,
} from "@/server/services/phase23-30";

const commandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set_gate"), payload: goLiveGateSchema }),
  z.object({ action: z.literal("activate_kill_switch"), payload: killSwitchSchema }),
  z.object({
    action: z.literal("release_kill_switch"),
    payload: z.object({ id: z.string().uuid() }),
  }),
  z.object({
    action: z.literal("create_objective"),
    payload: executiveObjectiveSchema,
  }),
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

  const workspaceId = auth.context.workspaceId;
  const actor = auth.context.actor;

  if (parsed.data.action === "set_gate") {
    const gate = await setGoLiveGate(workspaceId, actor, parsed.data.payload);
    await writeAuditLog({
      action: "go_live.gate_set",
      entityType: "GoLiveGate",
      entityId: gate.id,
      actor,
      workspaceId,
      metadata: { gateKey: gate.gateKey, status: gate.status },
    });
    return ok({ gate });
  }

  if (parsed.data.action === "create_objective") {
    const objective = await createExecutiveObjective(workspaceId, parsed.data.payload);
    await writeAuditLog({
      action: "executive.objective_created",
      entityType: "ExecutiveObjective",
      entityId: objective.id,
      actor,
      workspaceId,
      metadata: { metricKey: objective.metricKey },
    });
    return ok({ objective });
  }

  if (parsed.data.action === "release_kill_switch") {
    const killSwitch = await releaseKillSwitch(
      parsed.data.payload.id,
      workspaceId,
      actor,
    );
    await writeAuditLog({
      action: "operations.kill_switch_release",
      entityType: "OperationalKillSwitch",
      entityId: parsed.data.payload.id,
      actor,
      workspaceId,
      metadata: {},
    });
    return ok({ killSwitch });
  }

  const killSwitch = await activateKillSwitch(
    workspaceId,
    actor,
    parsed.data.payload,
  );
  await writeAuditLog({
    action: "operations.kill_switch_activate",
    entityType: "OperationalKillSwitch",
    entityId: killSwitch.id,
    actor,
    workspaceId,
    metadata: {
      scopeType: killSwitch.scopeType,
      scopeId: killSwitch.scopeId,
    },
  });
  return ok({ killSwitch });
}
