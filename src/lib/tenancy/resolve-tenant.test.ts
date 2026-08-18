import { describe, it, expect, afterEach } from "vitest";
import {
  InvalidTenantTokenError,
  resolveTenantIdForRequest,
  signTenantToken,
} from "@/lib/auth/tenant";

const SECRET = "test-tenant-secret-0123456789abcdefghij";
const DEFAULT = "00000000-0000-0000-0000-000000000001";

function tenantTokenFor(tenantId: string): Promise<string> {
  const previous = process.env.CARRYOS_TENANT_SECRET;
  process.env.CARRYOS_TENANT_SECRET = SECRET;
  return signTenantToken(tenantId).finally(() => {
    if (previous === undefined) delete process.env.CARRYOS_TENANT_SECRET;
    else process.env.CARRYOS_TENANT_SECRET = previous;
  });
}

afterEach(() => {
  delete process.env.CARRYOS_TENANT_SECRET;
});

describe("resolveTenantIdForRequest", () => {
  it("SINGLE_OWNER mode resolves to the default tenant without a token", async () => {
    await expect(
      resolveTenantIdForRequest({
        tenantToken: null,
        mode: "SINGLE_OWNER",
        defaultWorkspaceId: DEFAULT,
      }),
    ).resolves.toBe(DEFAULT);
  });

  it("SINGLE_OWNER mode honors a valid tenant token (CarryOS bridge)", async () => {
    const token = await tenantTokenFor("tenant-a");
    process.env.CARRYOS_TENANT_SECRET = SECRET;
    await expect(
      resolveTenantIdForRequest({
        tenantToken: token,
        mode: "SINGLE_OWNER",
        defaultWorkspaceId: DEFAULT,
      }),
    ).resolves.toBe("tenant-a");
  });

  it("MULTI_TENANT mode resolves a verified token", async () => {
    const token = await tenantTokenFor("tenant-b");
    process.env.CARRYOS_TENANT_SECRET = SECRET;
    await expect(
      resolveTenantIdForRequest({
        tenantToken: token,
        mode: "MULTI_TENANT",
        defaultWorkspaceId: DEFAULT,
      }),
    ).resolves.toBe("tenant-b");
  });

  it("MULTI_TENANT mode rejects a missing token (fail-closed, never downgrades)", async () => {
    process.env.CARRYOS_TENANT_SECRET = SECRET;
    await expect(
      resolveTenantIdForRequest({
        tenantToken: null,
        mode: "MULTI_TENANT",
        defaultWorkspaceId: DEFAULT,
      }),
    ).rejects.toBeInstanceOf(InvalidTenantTokenError);
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await tenantTokenFor("tenant-c");
    process.env.CARRYOS_TENANT_SECRET = "another-secret-0123456789abcdefghijk";
    await expect(
      resolveTenantIdForRequest({
        tenantToken: token,
        mode: "MULTI_TENANT",
        defaultWorkspaceId: DEFAULT,
      }),
    ).rejects.toBeInstanceOf(InvalidTenantTokenError);
  });

  it("rejects a malformed token", async () => {
    process.env.CARRYOS_TENANT_SECRET = SECRET;
    await expect(
      resolveTenantIdForRequest({
        tenantToken: "not-a-jwt",
        mode: "SINGLE_OWNER",
        defaultWorkspaceId: DEFAULT,
      }),
    ).rejects.toBeInstanceOf(InvalidTenantTokenError);
  });
});
