import "server-only";
import { prisma } from "@/lib/db/client";
import { Prisma, type WorkflowStatus, type WorkflowRunStatus, type WorkflowStepType } from "@/generated/prisma/client";

export type CreateWorkflowInput = {
  name: string;
  description?: string;
  trigger?: string;
  scheduleCron?: string;
  enabled?: boolean;
  ownerId?: string;
  config?: unknown;
  steps?: {
    type: WorkflowStepType;
    name: string;
    config?: unknown;
  }[];
};

function workflowJson(value: unknown): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : (value as Prisma.InputJsonValue);
}

export async function createWorkflow(
  workspaceId: string,
  input: CreateWorkflowInput,
) {
  const { steps, ...workflow } = input;
  return prisma.workflowDefinition.create({
    data: {
      workspaceId,
      ...workflow,
      config: workflowJson(workflow.config),
      steps: steps
        ? {
            create: steps.map((step, stepOrder) => ({
              stepOrder,
              type: step.type,
              name: step.name,
              config: workflowJson(step.config),
            })),
          }
        : undefined,
    },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });
}

export async function listWorkflows(workspaceId: string, filters?: { status?: string }) {
  return prisma.workflowDefinition.findMany({
    where: {
      workspaceId,
      ...(filters?.status ? { status: filters.status as WorkflowStatus } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      steps: { orderBy: { stepOrder: "asc" } },
      _count: { select: { runs: true } },
      runs: { orderBy: { startedAt: "desc" }, take: 1 },
    },
  });
}

export async function getWorkflow(id: string, workspaceId: string) {
  return prisma.workflowDefinition.findFirst({
    where: { id, workspaceId },
    include: {
      steps: { orderBy: { stepOrder: "asc" } },
      runs: { orderBy: { startedAt: "desc" }, take: 20 },
    },
  });
}

export async function listWorkflowRuns(workspaceId: string, filters?: { workflowId?: string; status?: string }) {
  return prisma.workflowRun.findMany({
    where: {
      workspaceId,
      ...(filters?.workflowId ? { workflowId: filters.workflowId } : {}),
      ...(filters?.status ? { status: filters.status as WorkflowRunStatus } : {}),
    },
    orderBy: { startedAt: "desc" },
    include: {
      workflow: { select: { id: true, name: true } },
      steps: { orderBy: { startedAt: "asc" } },
    },
  });
}

export async function getWorkflowRun(id: string, workspaceId: string) {
  return prisma.workflowRun.findFirst({
    where: { id, workspaceId },
    include: {
      workflow: { select: { id: true, name: true } },
      steps: { orderBy: { startedAt: "asc" } },
    },
  });
}


export async function updateWorkflowStatus(
  id: string,
  workspaceId: string,
  status: WorkflowStatus,
) {
  const existing = await prisma.workflowDefinition.findFirst({
    where: { id, workspaceId },
    select: { id: true },
  });
  if (!existing) throw new Error("WORKFLOW_NOT_FOUND");

  return prisma.workflowDefinition.update({
    where: { id: existing.id },
    data: { status },
  });
}

export async function addWorkflowStep(
  workflowId: string,
  workspaceId: string,
  input: {
    name: string;
    type: WorkflowStepType;
    config?: unknown;
  },
) {
  const workflow = await prisma.workflowDefinition.findFirst({
    where: { id: workflowId, workspaceId },
    select: { id: true },
  });
  if (!workflow) throw new Error("WORKFLOW_NOT_FOUND");

  return prisma.$transaction(async (tx) => {
    const existing = await tx.workflowStepDefinition.count({
      where: { workflowId: workflow.id, workspaceId },
    });
    return tx.workflowStepDefinition.create({
      data: {
        workspaceId,
        workflowId: workflow.id,
        name: input.name,
        type: input.type,
        config: workflowJson(input.config ?? {}),
        stepOrder: existing,
      },
    });
  });
}

export async function startWorkflowRun(
  workflowId: string,
  workspaceId: string,
  input: {
    actor: string;
    context?: unknown;
    idempotencyKey?: string;
  },
) {
  const workflow = await prisma.workflowDefinition.findFirst({
    where: { id: workflowId, workspaceId, status: "ACTIVE", enabled: true },
    select: { id: true },
  });
  if (!workflow) throw new Error("WORKFLOW_NOT_RUNNABLE");

  if (input.idempotencyKey) {
    const existing = await prisma.workflowRun.findFirst({
      where: {
        workspaceId,
        workflowId,
        context: {
          path: ["_execution", "idempotencyKey"],
          equals: input.idempotencyKey,
        },
      },
    });
    if (existing) return existing;
  }

  const base =
    input.context && typeof input.context === "object" && !Array.isArray(input.context)
      ? (input.context as Record<string, unknown>)
      : {};

  return prisma.workflowRun.create({
    data: {
      workspaceId,
      workflowId,
      triggeredBy: input.actor,
      status: "RUNNING",
      context: workflowJson({
        ...base,
        _execution: {
          idempotencyKey: input.idempotencyKey ?? null,
        },
      }),
    },
  });
}

export async function retryWorkflowRun(
  id: string,
  workspaceId: string,
  actor: string,
) {
  const previous = await prisma.workflowRun.findFirst({
    where: { id, workspaceId },
  });
  if (!previous) throw new Error("WORKFLOW_RUN_NOT_FOUND");
  if (previous.status !== "FAILED") {
    throw new Error("WORKFLOW_RUN_NOT_RETRYABLE");
  }

  const previousContext =
    previous.context &&
    typeof previous.context === "object" &&
    !Array.isArray(previous.context)
      ? (previous.context as Record<string, unknown>)
      : {};

  return prisma.workflowRun.create({
    data: {
      workspaceId,
      workflowId: previous.workflowId,
      triggeredBy: actor,
      status: "RUNNING",
      context: workflowJson({
        ...previousContext,
        _retry: { previousRunId: previous.id },
      }),
    },
  });
}

export async function cancelWorkflowRun(
  id: string,
  workspaceId: string,
) {
  const existing = await prisma.workflowRun.findFirst({
    where: { id, workspaceId },
    select: { id: true, status: true },
  });
  if (!existing) throw new Error("WORKFLOW_RUN_NOT_FOUND");
  if (existing.status !== "RUNNING") {
    throw new Error("WORKFLOW_RUN_NOT_CANCELLABLE");
  }

  const result = await prisma.workflowRun.updateMany({
    where: { id, workspaceId, status: "RUNNING" },
    data: { status: "CANCELLED", finishedAt: new Date() },
  });
  if (result.count !== 1) {
    throw new Error("WORKFLOW_RUN_NOT_CANCELLABLE");
  }

  const run = await prisma.workflowRun.findFirst({ where: { id, workspaceId } });
  if (!run) throw new Error("WORKFLOW_RUN_NOT_FOUND");
  return run;
}
