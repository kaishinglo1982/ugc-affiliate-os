import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authorizeCreatorRevenueService } from "./creator-revenue-service-auth";

const originalEnv = { ...process.env };
const token = "ugc-creator-revenue-service-token-1234567890abcdef";
const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function request(headers: Record<string, string> = {}): Request {
  return new Request("http://ugc.test/api/creator-revenue/health", { headers });
}

beforeEach(() => {
  process.env.UGC_SERVICE_TOKEN = token;
  process.env.CARRYOS_INTEGRATION_MODE = "STANDALONE";
  delete process.env.UGC_CREATOR_REVENUE_WORKSPACE_ID;
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Creator Revenue UGC service auth", () => {
  it("fails closed when UGC_SERVICE_TOKEN is missing", async () => {
    delete process.env.UGC_SERVICE_TOKEN;
    const result = authorizeCreatorRevenueService(request({ authorization: `Bearer ${token}` }));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected auth failure");
    expect(result.response.status).toBe(503);
    await expect(result.response.json()).resolves.toMatchObject({
      ok: false,
      error: "CREATOR_REVENUE_S2S_NOT_CONFIGURED",
    });
  });

  it("requires an explicit pinned workspace in CORE_BOUND mode", async () => {
    process.env.CARRYOS_INTEGRATION_MODE = "CORE_BOUND";
    const result = authorizeCreatorRevenueService(request({ authorization: `Bearer ${token}` }));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected auth failure");
    expect(result.response.status).toBe(503);

    process.env.UGC_CREATOR_REVENUE_WORKSPACE_ID = workspaceId;
    const configured = authorizeCreatorRevenueService(request({ authorization: `Bearer ${token}` }));
    expect(configured.ok).toBe(true);
    if (!configured.ok) throw new Error("expected auth success");
    expect(configured.context.workspaceId).toBe(workspaceId);
  });

  it("rejects missing, malformed and invalid bearer tokens", () => {
    const missing = authorizeCreatorRevenueService(request());
    const malformed = authorizeCreatorRevenueService(request({ authorization: token }));
    const invalid = authorizeCreatorRevenueService(request({ authorization: "Bearer wrong-token" }));
    expect(missing.ok).toBe(false);
    expect(malformed.ok).toBe(false);
    expect(invalid.ok).toBe(false);
  });

  it("rejects caller-supplied workspace or tenant headers", () => {
    const result = authorizeCreatorRevenueService(request({
      authorization: `Bearer ${token}`,
      "x-workspace-id": "other-workspace",
    }));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected auth failure");
    expect(result.response.status).toBe(400);
  });

  it("uses the standalone workspace only outside CORE_BOUND mode", () => {
    const result = authorizeCreatorRevenueService(request({ authorization: `Bearer ${token}` }));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected auth success");
    expect(result.context.clientId).toBe("creator-revenue-o");
  });
});
