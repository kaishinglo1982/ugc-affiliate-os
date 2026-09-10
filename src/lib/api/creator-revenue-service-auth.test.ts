import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authorizeCreatorRevenueService } from "./creator-revenue-service-auth";

const originalEnv = { ...process.env };
const token = "ugc-creator-revenue-service-token-1234567890abcdef";

function request(headers: Record<string, string> = {}): Request {
  return new Request("http://ugc.test/api/creator-revenue/health", { headers });
}

beforeEach(() => {
  process.env.UGC_SERVICE_TOKEN = token;
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

  it("rejects missing and invalid bearer tokens", () => {
    const missing = authorizeCreatorRevenueService(request());
    const invalid = authorizeCreatorRevenueService(request({ authorization: "Bearer wrong-token" }));

    expect(missing.ok).toBe(false);
    expect(invalid.ok).toBe(false);
    if (!missing.ok) expect(missing.response.status).toBe(401);
    if (!invalid.ok) expect(invalid.response.status).toBe(401);
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

  it("authorizes the service principal into the pinned single-owner workspace", () => {
    const result = authorizeCreatorRevenueService(request({ authorization: `Bearer ${token}` }));

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected auth success");
    expect(result.context).toMatchObject({
      clientId: "creator-revenue-o",
      workspaceId: process.env.DEFAULT_WORKSPACE_ID ?? "00000000-0000-0000-0000-000000000001",
    });
  });
});
