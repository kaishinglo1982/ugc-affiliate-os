import { describe, expect, it, vi } from "vitest";

const headersMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

import { resolveCarryOsTenantId } from "@/lib/auth/carryos-tenant-context";

describe("resolveCarryOsTenantId", () => {
  it("requires an explicit CarryOS tenant assertion", async () => {
    headersMock.mockResolvedValue(new Headers());

    await expect(resolveCarryOsTenantId()).rejects.toThrow(
      "CarryOS tenant assertion is required",
    );
  });
});
