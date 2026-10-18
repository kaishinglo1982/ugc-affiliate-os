import { describe, expect, it, beforeEach } from "vitest";
import { resolveWorkspaceIdForCarryOsTenant, TenantWorkspaceBindingError } from "./carryos-workspace-binding";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("resolveWorkspaceIdForCarryOsTenant", () => {
  beforeEach(() => {
    delete process.env.CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON;
  });

  it("maps a CarryOS tenant UUID to its explicitly configured workspace", () => {
    process.env.CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON = JSON.stringify({
      [TENANT_ID]: WORKSPACE_ID,
    });

    expect(resolveWorkspaceIdForCarryOsTenant(TENANT_ID)).toBe(WORKSPACE_ID);
  });

  it("resolves RFC 9562 UUIDv7 tenant and workspace identifiers", () => {
    const tenantIdV7 = "01890f3e-7c00-7000-8000-000000000001";
    const workspaceIdV7 = "01890f3e-7c00-7000-8000-000000000002";
    process.env.CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON = JSON.stringify({
      [tenantIdV7]: workspaceIdV7,
    });

    expect(resolveWorkspaceIdForCarryOsTenant(tenantIdV7)).toBe(workspaceIdV7);
  });

  it("rejects a tenant without an explicit binding", () => {
    process.env.CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON = JSON.stringify({});

    expect(() => resolveWorkspaceIdForCarryOsTenant(TENANT_ID))
      .toThrowError(new TenantWorkspaceBindingError("CARRYOS_TENANT_WORKSPACE_BINDING_NOT_CONFIGURED"));
  });

  it("rejects malformed binding configuration", () => {
    process.env.CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON = JSON.stringify({
      "not-a-uuid": WORKSPACE_ID,
    });

    expect(() => resolveWorkspaceIdForCarryOsTenant(TENANT_ID))
      .toThrowError(new TenantWorkspaceBindingError("CARRYOS_TENANT_WORKSPACE_BINDINGS_INVALID"));
  });

  it("rejects a non-UUID tenant subject before lookup", () => {
    process.env.CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON = JSON.stringify({
      [TENANT_ID]: WORKSPACE_ID,
    });

    expect(() => resolveWorkspaceIdForCarryOsTenant("tenant-123"))
      .toThrowError(new TenantWorkspaceBindingError("CARRYOS_TENANT_WORKSPACE_BINDING_SUBJECT_INVALID"));
  });
});
