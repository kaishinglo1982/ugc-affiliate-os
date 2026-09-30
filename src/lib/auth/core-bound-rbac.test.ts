import { beforeEach, describe, expect, it } from "vitest";
import { CoreBoundRoleBindingError, resolveCoreBoundRole } from "./core-bound-rbac";

const WORKSPACE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_ID = "11111111-1111-4111-8111-111111111111";

describe("resolveCoreBoundRole", () => {
  beforeEach(() => {
    delete process.env.CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON;
  });

  it("resolves an explicitly bound role", () => {
    process.env.CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON = JSON.stringify({
      [WORKSPACE_ID]: { [USER_ID]: "admin" },
    });

    expect(resolveCoreBoundRole(WORKSPACE_ID, USER_ID)).toBe("admin");
  });

  it("does not grant an implicit owner role", () => {
    process.env.CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON = JSON.stringify({
      [WORKSPACE_ID]: {},
    });

    expect(() => resolveCoreBoundRole(WORKSPACE_ID, USER_ID))
      .toThrowError(new CoreBoundRoleBindingError("CARRYOS_WORKSPACE_ROLE_BINDING_NOT_CONFIGURED"));
  });

  it("rejects malformed bindings", () => {
    process.env.CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON = "{invalid";

    expect(() => resolveCoreBoundRole(WORKSPACE_ID, USER_ID))
      .toThrowError(new CoreBoundRoleBindingError("CARRYOS_WORKSPACE_ROLE_BINDINGS_INVALID"));
  });

  it("rejects invalid role values", () => {
    process.env.CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON = JSON.stringify({
      [WORKSPACE_ID]: { [USER_ID]: "superuser" },
    });

    expect(() => resolveCoreBoundRole(WORKSPACE_ID, USER_ID))
      .toThrowError(new CoreBoundRoleBindingError("CARRYOS_WORKSPACE_ROLE_BINDINGS_INVALID"));
  });
});
