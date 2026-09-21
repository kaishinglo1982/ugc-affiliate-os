import { afterEach, describe, expect, it } from "vitest";
import {
  CoreBoundRoleBindingError,
  resolveCoreBoundRole,
} from "@/lib/auth/core-bound-rbac";

const workspaceA = "00000000-0000-4000-8000-000000000001";
const workspaceB = "00000000-0000-4000-8000-000000000002";
const userId = "11111111-1111-4111-8111-111111111111";

const originalBindings = process.env.CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON;

afterEach(() => {
  if (originalBindings === undefined) {
    delete process.env.CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON;
  } else {
    process.env.CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON = originalBindings;
  }
});

describe("resolveCoreBoundRole", () => {
  it("resolves different roles for the same user in different workspaces", () => {
    process.env.CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON = JSON.stringify({
      [workspaceA]: { [userId]: "viewer" },
      [workspaceB]: { [userId]: "admin" },
    });

    expect(resolveCoreBoundRole(workspaceA, userId)).toBe("viewer");
    expect(resolveCoreBoundRole(workspaceB, userId)).toBe("admin");
  });

  it("fails closed when no explicit workspace role exists", () => {
    process.env.CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON = JSON.stringify({
      [workspaceA]: {},
    });

    expect(() => resolveCoreBoundRole(workspaceA, userId)).toThrow(
      CoreBoundRoleBindingError,
    );
  });

  it("rejects invalid role-binding configuration", () => {
    process.env.CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON = JSON.stringify({
      [workspaceA]: { [userId]: "super-owner" },
    });

    expect(() => resolveCoreBoundRole(workspaceA, userId)).toThrow(
      "CARRYOS_WORKSPACE_ROLE_BINDINGS_INVALID",
    );
  });

  it("rejects malformed JSON", () => {
    process.env.CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON = "{";

    expect(() => resolveCoreBoundRole(workspaceA, userId)).toThrow(
      "CARRYOS_WORKSPACE_ROLE_BINDINGS_INVALID",
    );
  });
});
