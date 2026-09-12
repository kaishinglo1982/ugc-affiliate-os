import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({
  prisma: {
    workflowDefinition: {
      findFirst: vi.fn(),
    },
    workflowRun: {
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/client";
import {
  cancelWorkflowRun,
  retryWorkflowRun,
  startWorkflowRun,
} from "@/server/services/workflows";

const workflowDefinitionMock = prisma.workflowDefinition as unknown as {
  findFirst: ReturnType<typeof vi.fn>;
};
const workflowRunMock = prisma.workflowRun as unknown as {
  findFirst: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  updateMany: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("workflow lifecycle service", () => {
  it("writes the resolved workspace when starting a run", async () => {
    workflowDefinitionMock.findFirst.mockResolvedValueOnce({ id: "wf-1" });
    workflowRunMock.findFirst.mockResolvedValueOnce(null);
    workflowRunMock.create.mockResolvedValueOnce({ id: "run-1" });

    await startWorkflowRun("wf-1", "ws-1", {
      actor: "user-1",
      context: { productId: "p-1" },
      idempotencyKey: "exec-1",
    });

    expect(workflowDefinitionMock.findFirst).toHaveBeenCalledWith({
      where: {
        id: "wf-1",
        workspaceId: "ws-1",
        status: "ACTIVE",
        enabled: true,
      },
      select: { id: true },
    });
    expect(workflowRunMock.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "ws-1",
        workflowId: "wf-1",
        triggeredBy: "user-1",
        status: "RUNNING",
      }),
    });
  });

  it("returns an existing run for the same idempotency key", async () => {
    workflowDefinitionMock.findFirst.mockResolvedValueOnce({ id: "wf-1" });
    workflowRunMock.findFirst.mockResolvedValueOnce({ id: "run-existing" });

    const run = await startWorkflowRun("wf-1", "ws-1", {
      actor: "user-1",
      idempotencyKey: "exec-1",
    });

    expect(run.id).toBe("run-existing");
    expect(workflowRunMock.create).not.toHaveBeenCalled();
  });

  it("retries only failed runs and keeps the workspace explicit", async () => {
    workflowRunMock.findFirst.mockResolvedValueOnce({
      id: "run-1",
      workflowId: "wf-1",
      workspaceId: "ws-1",
      status: "FAILED",
      context: { productId: "p-1" },
    });
    workflowRunMock.create.mockResolvedValueOnce({ id: "run-2" });

    await retryWorkflowRun("run-1", "ws-1", "user-2");

    expect(workflowRunMock.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "ws-1",
        workflowId: "wf-1",
        triggeredBy: "user-2",
        status: "RUNNING",
      }),
    });
  });

  it("rejects retrying an active run", async () => {
    workflowRunMock.findFirst.mockResolvedValueOnce({
      id: "run-1",
      status: "RUNNING",
    });

    await expect(
      retryWorkflowRun("run-1", "ws-1", "user-1"),
    ).rejects.toThrow("WORKFLOW_RUN_NOT_RETRYABLE");
  });

  it("cancels a running run with an atomic tenant-scoped update", async () => {
    workflowRunMock.findFirst
      .mockResolvedValueOnce({ id: "run-1", status: "RUNNING" })
      .mockResolvedValueOnce({ id: "run-1", status: "CANCELLED" });
    workflowRunMock.updateMany.mockResolvedValueOnce({ count: 1 });

    const run = await cancelWorkflowRun("run-1", "ws-1");

    expect(run.status).toBe("CANCELLED");
    expect(workflowRunMock.updateMany).toHaveBeenCalledWith({
      where: { id: "run-1", workspaceId: "ws-1", status: "RUNNING" },
      data: expect.objectContaining({ status: "CANCELLED" }),
    });
  });
});
