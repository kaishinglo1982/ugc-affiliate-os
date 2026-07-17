import { describe, expect, it, vi } from "vitest";

import { createTenantHandler } from "@/server/http/tenant-handler";

vi.mock("@/server/tenancy/tenant-route-service", () => ({
  executeTenantRoute: vi.fn(async (input: { work: (tx: unknown, context: unknown) => Promise<unknown> }) =>
    input.work({ id: "tx" }, { workspaceId: "workspace", userId: "user", role: "OWNER" }),
  ),
}));

describe("createTenantHandler", () => {
  it("keeps each concurrent request local to its own handler invocation", async () => {
    const handler = createTenantHandler(
      {
        prisma: {} as never,
        resolveIdentity: vi.fn(async (request: Request) => ({
          userId: request.headers.get("x-user") ?? "missing",
          workspaceId: "00000000-0000-4000-8000-000000000001",
        })),
      },
      "VIEWER",
      async (request) => ({ marker: request.headers.get("x-marker") }),
    );

    const [first, second] = await Promise.all([
      handler(new Request("https://example.test", { headers: { "x-user": "u1", "x-marker": "first" } })),
      handler(new Request("https://example.test", { headers: { "x-user": "u2", "x-marker": "second" } })),
    ]);

    await expect(first.json()).resolves.toEqual({ data: { marker: "first" } });
    await expect(second.json()).resolves.toEqual({ data: { marker: "second" } });
  });
});
