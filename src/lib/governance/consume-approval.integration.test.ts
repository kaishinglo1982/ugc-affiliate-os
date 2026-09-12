// End-to-end single-use consumption flow (Phase 80.1). Real DB, no mocks.
// Covers: issue → consume once → second consume rejected (idempotent),
// missing/mismatched tokens, costs outside the envelope.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/client";
import {
  issueApprovalToken,
  consumeApprovalWithToken,
} from "./consume-approval";
import { getApprovalTokenSecret } from "./approval-token";

const workspaceId = `gov-test-${randomUUID()}`;
let approvalId: string;
let envelopeId: string;

beforeAll(async () => {
  const approval = await prisma.approval.create({
    data: {
      workspaceId,
      resourceType: "media_generation_job",
      resourceId: `res-${randomUUID()}`,
      status: "APPROVED",
      requestedBy: "owner",
      decidedBy: "owner",
      decidedAt: new Date(),
    },
  });
  approvalId = approval.id;
  const envelope = await prisma.costEnvelope.create({
    data: {
      workspaceId,
      approvalId: approval.id,
      category: "video_generation",
      currency: "EUR",
      minimum: "1.00",
      maximum: "50.00",
    },
  });
  envelopeId = envelope.id;
  if (process.env.APPROVAL_TOKEN_SECRET === undefined) {
    process.env.APPROVAL_TOKEN_SECRET =
      "test-approval-integration-secret-123456";
  }
  getApprovalTokenSecret();
});

afterAll(async () => {
  await prisma.costEnvelope.deleteMany({ where: { workspaceId } });
  await prisma.approval.deleteMany({ where: { workspaceId } });
});

describe("consumeApprovalWithToken (integration)", () => {
  it("consumes an issued token exactly once", async () => {
    const issued = await issueApprovalToken({ workspaceId, approvalId });
    expect(issued.ok).toBe(true);
    const token = issued.ok ? issued.token : "";

    const first = await consumeApprovalWithToken({
      workspaceId,
      approvalId,
      token,
      cost: "25.00",
      currency: "EUR",
      actor: "owner",
    });
    expect(first).toEqual({ ok: true, approvalId, envelopeId });

    const second = await consumeApprovalWithToken({
      workspaceId,
      approvalId,
      token,
      cost: "25.00",
      currency: "EUR",
      actor: "owner",
    });
    expect(second).toEqual({ ok: false, code: "ALREADY_CONSUMED" });
  });

  it("rejects a token mismatch (fail-closed)", async () => {
    const fresh = await prisma.approval.create({
      data: {
        workspaceId,
        resourceType: "media_generation_job",
        resourceId: `res-${randomUUID()}`,
        status: "APPROVED",
      },
    });
    const issued = await issueApprovalToken({
      workspaceId,
      approvalId: fresh.id,
    });
    expect(issued.ok).toBe(true);

    const result = await consumeApprovalWithToken({
      workspaceId,
      approvalId: fresh.id,
      token: "forged-token",
      cost: "10.00",
      currency: "EUR",
      actor: "owner",
    });
    expect(result).toEqual({ ok: false, code: "TOKEN_MISMATCH" });

    await prisma.approval.deleteMany({ where: { id: fresh.id } });
  });

  it("rejects a cost above the envelope maximum", async () => {
    const fresh = await prisma.approval.create({
      data: {
        workspaceId,
        resourceType: "media_generation_job",
        resourceId: `res-${randomUUID()}`,
        status: "APPROVED",
        envelopes: {
          create: [
            {
              workspaceId,
              category: "video_generation",
              currency: "EUR",
              minimum: "1.00",
              maximum: "50.00",
            },
          ],
        },
      },
    });
    const issued = await issueApprovalToken({
      workspaceId,
      approvalId: fresh.id,
    });
    expect(issued.ok).toBe(true);
    const token = issued.ok ? issued.token : "";

    const result = await consumeApprovalWithToken({
      workspaceId,
      approvalId: fresh.id,
      token,
      cost: "99.00",
      currency: "EUR",
      actor: "owner",
    });
    expect(result).toEqual({ ok: false, code: "COST_OUTSIDE_ENVELOPE" });

    await prisma.approval.deleteMany({ where: { id: fresh.id } });
  });
});
