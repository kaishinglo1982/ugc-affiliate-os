import { describe, expect, it } from "vitest";

import {
  assertWorkspaceId,
  InvalidWorkspaceIdError,
} from "@/lib/tenancy/context";

describe("workspace context", () => {
  it("accepts canonical UUID workspace ids", () => {
    expect(() =>
      assertWorkspaceId("00000000-0000-4000-8000-000000000001"),
    ).not.toThrow();
  });

  it("rejects empty, malformed and injection-like workspace ids", () => {
    for (const workspaceId of [
      "",
      "workspace-a",
      "00000000-0000-0000-0000-000000000001'; RESET ROLE; --",
    ]) {
      expect(() => assertWorkspaceId(workspaceId)).toThrow(
        InvalidWorkspaceIdError,
      );
    }
  });
});
