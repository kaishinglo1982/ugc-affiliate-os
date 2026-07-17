import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { assertWorkspaceId } from "@/lib/tenancy/workspace-context";

const workerContextSchema = z.object({
  workspaceId: z.string().uuid(),
  subject: z.string().min(1).max(200),
  issuedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().positive(),
  correlationId: z.string().min(1).max(200),
});

export type WorkerWorkspaceContext = z.infer<typeof workerContextSchema>;

function workerSecret(): string {
  const secret = process.env.WORKER_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("WORKER_SECRET must contain at least 32 characters.");
  }
  return secret;
}

function signature(payload: string): string {
  return createHmac("sha256", workerSecret()).update(payload).digest("base64url");
}

export function encodeWorkerWorkspaceContext(context: WorkerWorkspaceContext): string {
  const parsed = workerContextSchema.parse(context);
  assertWorkspaceId(parsed.workspaceId);
  const payload = Buffer.from(JSON.stringify(parsed)).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function decodeWorkerWorkspaceContext(token: string, now = Date.now()): WorkerWorkspaceContext {
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) throw new Error("Invalid worker context token.");

  const expected = Buffer.from(signature(payload));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    throw new Error("Invalid worker context signature.");
  }

  const parsed = workerContextSchema.parse(
    JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
  );
  if (parsed.expiresAt <= now) throw new Error("Worker context token has expired.");
  assertWorkspaceId(parsed.workspaceId);
  return parsed;
}
