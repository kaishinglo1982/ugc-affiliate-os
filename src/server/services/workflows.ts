import "server-only";
import { prisma } from "@/lib/db/client";
import type { WorkflowStatus, WorkflowRunStatus } from "@/generated/prisma/client";

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
