import { afterEach, describe, expect, it } from "vitest";

import {
  decodeWorkerWorkspaceContext,
  encodeWorkerWorkspaceContext,
} from "@/lib/tenancy/worker-context";

const originalSecret = process.env.WORKER_SECRET;

afterEach(() => {
  process.env.WORKER_SECRET = originalSecret;
});

describe("worker workspace context", () => {
  it("round-trips a signed tenant context", () => {
    process.env.WORKER_SECRET = "test-worker-secret-that-is-longer-than-32-characters";
    const token = encodeWorkerWorkspaceContext({
      workspaceId: "00000000-0000-4000-8000-000000000001",
      subject: "analytics-sync",
      issuedAt: 1_000,
      expiresAt: 10_000,
      correlationId: "corr-1",
    });

    expect(decodeWorkerWorkspaceContext(token, 5_000)).toMatchObject({
      workspaceId: "00000000-0000-4000-8000-000000000001",
      subject: "analytics-sync",
      correlationId: "corr-1",
    });
  });

  it("rejects tampering and expiry", () => {
    process.env.WORKER_SECRET = "test-worker-secret-that-is-longer-than-32-characters";
    const token = encodeWorkerWorkspaceContext({
      workspaceId: "00000000-0000-4000-8000-000000000001",
      subject: "publish",
      issuedAt: 1_000,
      expiresAt: 2_000,
      correlationId: "corr-2",
    });

    expect(() => decodeWorkerWorkspaceContext(`${token}x`, 1_500)).toThrow();
    expect(() => decodeWorkerWorkspaceContext(token, 2_001)).toThrow("expired");
  });
});
