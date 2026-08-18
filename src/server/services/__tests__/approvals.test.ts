import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({
  prisma: {
    approval: {
      create: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));
vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: vi.fn(),
}));

import { prisma } from "@/lib/db/client";
import {
  createApprovalRequest,
  decideApproval,
} from "@/server/services/approvals";

const approvalMock = prisma.approval as unknown as {
  create: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  updateMany: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("approval service", () => {
  it("uses the trusted actor supplied by the route context", async () => {
    approvalMock.create.mockResolvedValueOnce({ id: "approval-1" });

    await createApprovalRequest(
      {
        resourceType: "agent_tool_invocation",
        resourceId: "tool-call-1",
        requestedBy: "user-1",
        cost: 1.25,
        currency: "EUR",
      },
      "ws-1",
    );

    expect(approvalMock.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "ws-1",
        requestedBy: "user-1",
        status: "PENDING",
      }),
    });
  });

  it("rejects decisions for another workspace", async () => {
    approvalMock.findFirst.mockResolvedValueOnce(null);

    await expect(
      decideApproval("approval-1", "ws-other", {
        decision: "APPROVED",
        decidedBy: "user-1",
      }),
    ).rejects.toThrow("APPROVAL_NOT_FOUND");

    expect(approvalMock.updateMany).not.toHaveBeenCalled();
  });

  it("rejects expired approvals", async () => {
    approvalMock.findFirst.mockResolvedValueOnce({
      id: "approval-1",
      status: "PENDING",
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(
      decideApproval("approval-1", "ws-1", {
        decision: "APPROVED",
        decidedBy: "user-1",
      }),
    ).rejects.toThrow("APPROVAL_EXPIRED");

    expect(approvalMock.updateMany).not.toHaveBeenCalled();
  });

  it("atomically decides one pending approval", async () => {
    approvalMock.findFirst
      .mockResolvedValueOnce({
        id: "approval-1",
        status: "PENDING",
        expiresAt: null,
      })
      .mockResolvedValueOnce({
        id: "approval-1",
        status: "APPROVED",
      });
    approvalMock.updateMany.mockResolvedValueOnce({ count: 1 });

    const result = await decideApproval("approval-1", "ws-1", {
      decision: "APPROVED",
      decisionReason: "Budget geprüft",
      decidedBy: "user-1",
    });

    expect(result.status).toBe("APPROVED");
    expect(approvalMock.updateMany).toHaveBeenCalledWith({
      where: {
        id: "approval-1",
        workspaceId: "ws-1",
        status: "PENDING",
      },
      data: expect.objectContaining({
        status: "APPROVED",
        decidedBy: "user-1",
        decisionReason: "Budget geprüft",
      }),
    });
  });

  it("detects a concurrent second decision", async () => {
    approvalMock.findFirst.mockResolvedValueOnce({
      id: "approval-1",
      status: "PENDING",
      expiresAt: null,
    });
    approvalMock.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      decideApproval("approval-1", "ws-1", {
        decision: "REJECTED",
        decidedBy: "user-2",
      }),
    ).rejects.toThrow("APPROVAL_ALREADY_DECIDED");
  });
});
