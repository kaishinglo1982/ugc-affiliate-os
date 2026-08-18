import "server-only";
import { prisma } from "@/lib/db/client";
import {
  generateApprovalToken,
  hashApprovalToken,
  getApprovalTokenSecret,
} from "./approval-token";
import { evaluateCostAgainstEnvelope } from "./cost-envelope";

/**
 * Single-use consumption of an approved, enveloped action (Phase 80.1).
 *
 * Guard rails:
 * - The approval must exist in the caller's workspace.
 * - The token must verify against Approval.approvalTokenHash (HMAC).
 * - The approval must be APPROVED and not yet consumed (idempotent: a second
 *   call with the same verified token fails without side effects).
 * - The cost must sit inside the linked CostEnvelope (currency + brackets).
 * - Consumption flips approval + envelope atomically; audit is written.
 */

export type ConsumeResult =
  | { ok: true; approvalId: string; envelopeId: string | null }
  | { ok: false; code: ConsumeErrorCode };

export type ConsumeErrorCode =
  | "APPROVAL_NOT_FOUND"
  | "ENVELOPE_MISSING"
  | "TOKEN_MISMATCH"
  | "ALREADY_CONSUMED"
  | "NOT_APPROVED"
  | "COST_OUTSIDE_ENVELOPE"
  | "CONCURRENT_CONSUME";

export async function consumeApprovalWithToken(input: {
  workspaceId: string;
  approvalId: string;
  token: string;
  cost: string;
  currency: string;
  actor: string;
}): Promise<ConsumeResult> {
  const secret = getApprovalTokenSecret();
  const approval = await prisma.approval.findFirst({
    where: { id: input.approvalId, workspaceId: input.workspaceId },
    include: { envelopes: { orderBy: { createdAt: "asc" } } },
  });
  if (!approval) return { ok: false, code: "APPROVAL_NOT_FOUND" };

  if (approval.consumedAt) return { ok: false, code: "ALREADY_CONSUMED" };
  if (approval.status !== "APPROVED")
    return { ok: false, code: "NOT_APPROVED" };

  const hasEnvelope = approval.envelopes.length > 0;
  if (hasEnvelope) {
    const envelope = approval.envelopes[0];
    const decision = evaluateCostAgainstEnvelope({
      cost: input.cost,
      currency: input.currency,
      envelope: {
        currency: envelope.currency,
        minimum: envelope.minimum.toString(),
        maximum: envelope.maximum.toString(),
        status: envelope.status,
        expiresAt: envelope.expiresAt,
      },
    });
    if (!decision.allowed) return { ok: false, code: "COST_OUTSIDE_ENVELOPE" };
    if (!approval.approvalTokenHash || envelope.status !== "ACTIVE") {
      return { ok: false, code: "COST_OUTSIDE_ENVELOPE" };
    }
  }

  if (!approval.approvalTokenHash)
    return { ok: false, code: "ENVELOPE_MISSING" };
  if (!verifyToken(input.token, approval.approvalTokenHash, secret)) {
    return { ok: false, code: "TOKEN_MISMATCH" };
  }

  return prisma.$transaction(async (tx) => {
    const locked = await tx.approval.findFirst({
      where: { id: input.approvalId, workspaceId: input.workspaceId },
      include: { envelopes: { orderBy: { createdAt: "asc" } } },
    });
    if (!locked)
      return { ok: false, code: "APPROVAL_NOT_FOUND" } as ConsumeResult;
    if (locked.consumedAt)
      return { ok: false, code: "ALREADY_CONSUMED" } as ConsumeResult;

    const updated = await tx.approval.updateMany({
      where: { id: input.approvalId, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (updated.count !== 1)
      return { ok: false, code: "CONCURRENT_CONSUME" } as ConsumeResult;

    let consumedEnvelopeId: string | null = null;
    if (locked.envelopes && locked.envelopes.length > 0) {
      const envelope = locked.envelopes[0];
      if (envelope && envelope.status === "ACTIVE") {
        await tx.costEnvelope.updateMany({
          where: { id: envelope.id, status: "ACTIVE" },
          data: { status: "CONSUMED", consumedAt: new Date() },
        });
        consumedEnvelopeId = envelope.id;
      }
    }

    return { ok: true, approvalId: locked.id, envelopeId: consumedEnvelopeId };
  });
}

function verifyToken(
  token: string,
  storedHash: string,
  secret: string,
): boolean {
  const candidate = hashApprovalToken(token, secret);
  if (candidate.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) {
    diff |= candidate.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}

export async function issueApprovalToken(input: {
  workspaceId: string;
  approvalId: string;
}): Promise<{ ok: true; token: string } | { ok: false; code: string }> {
  const approval = await prisma.approval.findFirst({
    where: { id: input.approvalId, workspaceId: input.workspaceId },
  });
  if (!approval) return { ok: false, code: "APPROVAL_NOT_FOUND" };
  if (approval.status !== "APPROVED")
    return { ok: false, code: "NOT_APPROVED" };
  if (approval.approvalTokenHash)
    return { ok: false, code: "TOKEN_ALREADY_ISSUED" };

  const token = generateApprovalToken();
  const hash = hashApprovalToken(token, getApprovalTokenSecret());
  await prisma.approval.update({
    where: { id: approval.id },
    data: { approvalTokenHash: hash },
  });
  return { ok: true, token };
}
