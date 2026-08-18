import "server-only";
import { prisma } from "@/lib/db/client";
import { incrementMetric } from "@/lib/observability/metrics";
import type { AgentStatus, AgentRunStatus, AgentMemoryType, AgentToolRiskLevel } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";

/**
 * Lifecycle states an agent moves through. Mirrors the Prisma `AgentStatus`
 * enum (registered == IDLE at creation, enabled == RUNNING available, running
 * while executing, paused, disabled == ERROR-like terminal/disabled state).
 * The transition helper below guards illegal transitions so callers cannot put
 * an agent into an inconsistent lifecycle position.
 */
const AGENT_LIFECYCLE_TRANSITIONS: Record<AgentStatus, readonly AgentStatus[]> = {
  IDLE: ["RUNNING", "PAUSED", "ERROR"],
  RUNNING: ["IDLE", "PAUSED", "ERROR"],
  PAUSED: ["IDLE", "RUNNING", "ERROR"],
  ERROR: ["IDLE", "PAUSED"],
};

export type AgentLifecycleStatus =
  | "registered"
  | "enabled"
  | "running"
  | "paused"
  | "disabled";

/**
 * Map the documented lifecycle vocabulary (registered/enabled/running/paused/
 * disabled) onto the existing `AgentStatus` enum so the API surface reads
 * human-friendly while the persisted value stays consistent with the schema.
 */
const LIFECYCLE_TO_STATUS: Record<AgentLifecycleStatus, AgentStatus> = {
  registered: "IDLE",
  enabled: "IDLE",
  running: "RUNNING",
  paused: "PAUSED",
  disabled: "ERROR",
};

export function isLifecycleStatus(value: string): value is AgentLifecycleStatus {
  return Object.prototype.hasOwnProperty.call(LIFECYCLE_TO_STATUS, value);
}

/**
 * Validate that moving `from` -> `to` is an allowed lifecycle transition.
 * Returns false for the same state and for any illegal jump (e.g. ERROR -> RUNNING).
 */
export function canTransitionAgentStatus(from: AgentStatus, to: AgentStatus): boolean {
  return AGENT_LIFECYCLE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Transition an agent to a new lifecycle/status. Enforces the allowed
 * transition matrix and fails closed (throws) on an illegal jump rather than
 * silently persisting an invalid state. Tenant isolation is achieved via the
 * `workspaceId` filter — callers must supply the resolved workspace id.
 */
export async function setAgentStatus(
  id: string,
  lifecycle: AgentLifecycleStatus,
  options: { workspaceId?: string } = {},
): Promise<AgentStatus> {
  const target = LIFECYCLE_TO_STATUS[lifecycle];

  const agent = await prisma.agent.findFirst({
    where: { id, ...(options.workspaceId ? { workspaceId: options.workspaceId } : {}) },
    select: { id: true, status: true },
  });
  if (!agent) {
    throw new Error("AGENT_NOT_FOUND");
  }

  if (agent.status === target) {
    return agent.status;
  }

  if (!canTransitionAgentStatus(agent.status, target)) {
    throw new Error(
      `ILLEGAL_AGENT_TRANSITION: ${agent.status} -> ${target}`,
    );
  }

  const updated = await prisma.agent.update({
    where: { id },
    data: { status: target },
    select: { id: true, status: true },
  });

  return updated.status;
}

export type AgentCapability = {
  name: string;
  version: string | null;
  permissions: {
    requiresApproval: boolean;
    maxCostPerCall: number | null;
    rateLimitPerMin: number | null;
    allowedAgentKeys: string[];
  }[];
};

/**
 * Return the registered tools for a workspace as Agent "capabilities",
 * surfacing the tool name, its schema-version-ish identifier (we reuse the
 * tool id as version anchor) and the resolved permission set from the
 * attached `AgentToolPolicy` rows. Only enabled tools are exposed as live
 * capabilities. Tenant-isolated by `workspaceId`.
 */
export async function getAgentCapabilities(
  workspaceId: string,
  filters: { enabledOnly?: boolean } = {},
): Promise<AgentCapability[]> {
  const definitions = await prisma.agentToolDefinition.findMany({
    where: {
      workspaceId,
      ...(filters.enabledOnly ? { enabled: true } : {}),
    },
    orderBy: { name: "asc" },
    include: { policies: true },
  });

  return definitions.map((def) => ({
    name: def.name,
    version: def.id,
    permissions: def.policies.map((policy) => ({
      requiresApproval: policy.requiresApproval,
      maxCostPerCall: policy.maxCostPerCall?.toNumber() ?? null,
      rateLimitPerMin: policy.rateLimitPerMin,
      allowedAgentKeys: policy.allowedAgentKeys,
    })),
  }));
}

export type AgentRunStartInput = {
  agentId: string;
  executionKey?: string;
  summary?: string;
  logs?: unknown;
};

export type AgentRunFinishInput = {
  status: "SUCCESS" | "FAILED";
  summary?: string;
  logs?: unknown;
};

function nullableJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === undefined || value === null
    ? Prisma.JsonNull
    : (value as Prisma.InputJsonValue);
}

function agentRunLogs(input: AgentRunStartInput): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!input.executionKey) return nullableJson(input.logs);

  const base =
    input.logs && typeof input.logs === "object" && !Array.isArray(input.logs)
      ? { ...(input.logs as Record<string, unknown>) }
      : {};

  return {
    ...base,
    executionKey: input.executionKey,
  } as Prisma.InputJsonValue;
}

/**
 * Start (or idempotently return) an AgentRun. When `executionKey` is supplied
 * the run is deduplicated: a re-sent request with the same key returns the
 * existing RUNNING run instead of creating a duplicate. The owning agent's
 * `status` is flipped to RUNNING and `lastRunAt` stamped. Observability counter
 * `agentRunsTotal` is incremented. Tenant isolation is enforced via the
 * `workspaceId` filter on the owning agent.
 */
export async function startAgentRun(
  input: AgentRunStartInput,
  options: { workspaceId?: string; incrementObservability?: boolean } = {},
): Promise<{ id: string; status: AgentRunStatus; startedAt: Date }> {
  if (input.executionKey) {
    const existing = await prisma.agentRun.findFirst({
      where: {
        agentId: input.agentId,
        status: "RUNNING",
        logs: { path: ["executionKey"], equals: input.executionKey },
      },
      select: { id: true, status: true, startedAt: true },
    });
    if (existing) {
      return { id: existing.id, status: (existing.status as AgentRunStatus), startedAt: existing.startedAt };
    }
  }

  const agent = await prisma.agent.findFirst({
    where: {
      id: input.agentId,
      ...(options.workspaceId ? { workspaceId: options.workspaceId } : {}),
    },
    select: { id: true },
  });
  if (!agent) {
    throw new Error("AGENT_NOT_FOUND");
  }

  const run = await prisma.agentRun.create({
    data: {
      agentId: input.agentId,
      status: "RUNNING",
      summary: input.summary ?? null,
      logs: agentRunLogs(input),
    },
    select: { id: true, status: true, startedAt: true },
  });

  await prisma.agent.update({
    where: { id: input.agentId },
    data: { status: "RUNNING", lastRunAt: new Date() },
  });

  if (options.incrementObservability ?? true) {
    incrementMetric("ugc_agent_runs_total");
  }

  return { id: run.id, status: run.status as AgentRunStatus, startedAt: run.startedAt };
}

/**
 * Finish an AgentRun idempotently. Re-finishing an already-terminal run is a
 * no-op that returns the current status. Observability counter is incremented
 * exactly once per terminal transition. The owning agent returns to IDLE
 * unless it was put into an error lifecycle.
 */
export async function finishAgentRun(
  runId: string,
  input: AgentRunFinishInput,
  options: { incrementObservability?: boolean } = {},
): Promise<{ id: string; status: AgentRunStatus; finishedAt: Date | null }> {
  const run = await prisma.agentRun.findUnique({
    where: { id: runId },
    select: { id: true, status: true, agentId: true },
  });
  if (!run) {
    throw new Error("AGENT_RUN_NOT_FOUND");
  }

  if (run.status !== "RUNNING") {
    return {
      id: run.id,
      status: run.status as AgentRunStatus,
      finishedAt: null,
    };
  }

  const updated = await prisma.agentRun.update({
    where: { id: runId },
    data: {
      status: input.status,
      summary: input.summary ?? undefined,
      ...(input.logs !== undefined ? { logs: nullableJson(input.logs) } : {}),
      finishedAt: new Date(),
    },
    select: { id: true, status: true, finishedAt: true },
  });

  if (input.status === "SUCCESS") {
    await prisma.agent.update({
      where: { id: run.agentId },
      data: { status: "IDLE", successCount: { increment: 1 } },
    });
  } else {
    await prisma.agent.update({
      where: { id: run.agentId },
      data: { status: "ERROR", errorCount: { increment: 1 } },
    });
  }

  if (options.incrementObservability ?? true) {
    incrementMetric(
      input.status === "SUCCESS"
        ? "ugc_agent_runs_succeeded_total"
        : "ugc_agent_runs_failed_total",
    );
  }

  return {
    id: updated.id,
    status: updated.status as AgentRunStatus,
    finishedAt: updated.finishedAt,
  };
}

// ---------------------------------------------------------------------------
// Agent Memory (CRUD over the existing `AgentMemoryEntry` model)
// ---------------------------------------------------------------------------

export type AgentMemoryEntryInput = {
  workspaceId: string;
  agentKey: string;
  type?: AgentMemoryType;
  key: string;
  value?: unknown;
  importance?: number;
  expiresAt?: Date | null;
};

/**
 * Create a memory entry for an agent. Tenant-isolated via `workspaceId`.
 */
export async function createAgentMemoryEntry(input: AgentMemoryEntryInput) {
  return prisma.agentMemoryEntry.create({
    data: {
      workspaceId: input.workspaceId,
      agentKey: input.agentKey,
      type: input.type ?? "FACT",
      key: input.key,
      value: nullableJson(input.value),
      importance: input.importance ?? 1,
      expiresAt: input.expiresAt ?? null,
    },
  });
}

/**
 * Read memory entries for an agent, optionally filtered by memory type.
 * Tenant-isolated via `workspaceId`; never returns entries from other tenants.
 */
export async function getAgentMemoryEntries(
  workspaceId: string,
  agentKey: string,
  filters: { type?: AgentMemoryType } = {},
) {
  return prisma.agentMemoryEntry.findMany({
    where: {
      workspaceId,
      agentKey,
      ...(filters.type ? { type: filters.type } : {}),
    },
    orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
  });
}

/**
 * Update an agent memory entry by id. Tenant-isolated via `workspaceId`.
 */
export async function updateAgentMemoryEntry(
  id: string,
  workspaceId: string,
  patch: {
    type?: AgentMemoryType;
    key?: string;
    value?: unknown;
    importance?: number;
    expiresAt?: Date | null;
  },
) {
  return prisma.agentMemoryEntry.update({
    where: { id },
    data: {
      ...(patch.type ? { type: patch.type } : {}),
      ...(patch.key ? { key: patch.key } : {}),
      ...(patch.value !== undefined ? { value: nullableJson(patch.value) } : {}),
      ...(patch.importance !== undefined ? { importance: patch.importance } : {}),
      ...(patch.expiresAt !== undefined ? { expiresAt: patch.expiresAt } : {}),
    },
  });
}

/**
 * Delete an agent memory entry by id. Tenant-isolated via `workspaceId`.
 */
export async function deleteAgentMemoryEntry(id: string, workspaceId: string) {
  return prisma.agentMemoryEntry.deleteMany({
    where: { id, workspaceId },
  });
}

export type UpdateAgentInput = {
  name?: string;
  description?: string;
  status?: AgentStatus;
};

/**
 * Update an agent through the canonical service while enforcing workspace
 * ownership and the lifecycle transition matrix.
 */
export async function updateAgent(
  id: string,
  workspaceId: string,
  input: UpdateAgentInput,
) {
  const existing = await prisma.agent.findFirst({
    where: { id, workspaceId },
    select: { id: true, status: true },
  });
  if (!existing) {
    throw new Error("AGENT_NOT_FOUND");
  }

  if (
    input.status !== undefined &&
    input.status !== existing.status &&
    !canTransitionAgentStatus(existing.status, input.status)
  ) {
    throw new Error(
      `ILLEGAL_AGENT_TRANSITION: ${existing.status} -> ${input.status}`,
    );
  }

  return prisma.agent.update({
    where: { id: existing.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
  });
}

export type CreateAgentInput = {
  key: string;
  name: string;
  role: string;
  description?: string;
  capabilities?: string[];
  allowedActions?: string[];
  status?: AgentStatus;
};

/**
 * Register one agent through the canonical agent service. Route handlers must
 * not write agent rows directly.
 */
export async function createAgent(input: CreateAgentInput) {
  return prisma.agent.create({
    data: {
      key: input.key,
      name: input.name,
      role: input.role,
      description: input.description ?? "",
      capabilities: input.capabilities ?? [],
      allowedActions: input.allowedActions ?? [],
      status: input.status ?? "IDLE",
    },
  });
}

export async function listAgents(filters?: { status?: string }) {
  return prisma.agent.findMany({
    where: {
      ...(filters?.status ? { status: filters.status as AgentStatus } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAgent(id: string) {
  return prisma.agent.findFirst({
    where: { id },
    include: {
      runs: { orderBy: { startedAt: "desc" }, take: 10 },
    },
  });
}

export async function listAgentRuns(filters?: { agentId?: string; status?: string }) {
  return prisma.agentRun.findMany({
    where: {
      ...(filters?.agentId ? { agentId: filters.agentId } : {}),
      ...(filters?.status ? { status: filters.status as AgentRunStatus } : {}),
    },
    orderBy: { startedAt: "desc" },
    include: { agent: { select: { id: true, name: true, key: true } } },
  });
}

export async function getAgentRun(id: string) {
  return prisma.agentRun.findFirst({
    where: { id },
    include: {
      agent: { select: { id: true, name: true, key: true } },
      toolCalls: { orderBy: { createdAt: "desc" } },
    },
  });
}

export type CreateAgentToolInput = {
  name: string;
  description?: string;
  provider?: string;
  riskLevel?: AgentToolRiskLevel;
  enabled?: boolean;
  schema?: unknown;
  policy?: {
    requiresApproval?: boolean;
    maxCostPerCall?: number;
    rateLimitPerMin?: number;
    allowedAgentKeys?: string[];
  };
};

export async function createAgentTool(
  workspaceId: string,
  input: CreateAgentToolInput,
) {
  const { policy, ...tool } = input;
  return prisma.agentToolDefinition.create({
    data: {
      workspaceId,
      ...tool,
      schema:
        tool.schema === undefined ? undefined : nullableJson(tool.schema),
      riskLevel: tool.riskLevel ?? "LOW",
      enabled: tool.enabled ?? true,
      policies: policy
        ? {
            create: {
              requiresApproval: policy.requiresApproval ?? false,
              maxCostPerCall: policy.maxCostPerCall,
              rateLimitPerMin: policy.rateLimitPerMin,
              allowedAgentKeys: policy.allowedAgentKeys ?? [],
            },
          }
        : undefined,
    },
    include: { policies: true },
  });
}

export async function updateAgentToolEnabled(
  id: string,
  workspaceId: string,
  enabled: boolean,
) {
  const existing = await prisma.agentToolDefinition.findFirst({
    where: { id, workspaceId },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("AGENT_TOOL_NOT_FOUND");
  }

  return prisma.agentToolDefinition.update({
    where: { id: existing.id },
    data: { enabled },
    include: { policies: true },
  });
}

export async function listAgentTools(workspaceId: string) {
  return prisma.agentToolDefinition.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
    include: { policies: true },
  });
}
