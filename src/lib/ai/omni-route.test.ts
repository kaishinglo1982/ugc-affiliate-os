import { describe, expect, it } from "vitest";

import type { AiProvider } from "@/lib/ai/contracts";
import { OfflineAiProvider } from "@/lib/ai/offline-provider";
import { OmniRoute } from "@/lib/ai/omni-route";
import { AiRoutingError } from "@/lib/ai/router";

const request = {
  workspaceId: "workspace-a",
  capability: "content.caption" as const,
  prompt: "Isolierflasche aus Edelstahl",
  temperature: 0,
  maxOutputTokens: 200,
  metadata: {},
};

function failingProvider(): AiProvider {
  return {
    id: "paid-failing",
    offline: false,
    supports: () => true,
    isAvailable: async () => true,
    generate: async () => {
      throw new Error("provider unavailable");
    },
  };
}

describe("OmniRoute", () => {
  it("selects the zero-cost offline provider under a zero budget", async () => {
    const route = new OmniRoute([
      {
        provider: failingProvider(),
        capabilities: ["content.caption"],
        estimatedCostCents: 2,
        priority: 1,
      },
      {
        provider: new OfflineAiProvider(),
        capabilities: ["content.caption"],
        estimatedCostCents: 0,
        priority: 10,
      },
    ]);

    const result = await route.generate(request, { maximumEstimatedCostCents: 0 });
    expect(result.response.provider).toBe("offline");
    expect(result.attempts).toEqual([{ providerId: "offline", outcome: "selected" }]);
  });

  it("falls back after a provider failure when policy allows it", async () => {
    const route = new OmniRoute([
      {
        provider: failingProvider(),
        capabilities: ["content.caption"],
        estimatedCostCents: 0,
        priority: 1,
      },
      {
        provider: new OfflineAiProvider(),
        capabilities: ["content.caption"],
        estimatedCostCents: 0,
        priority: 2,
      },
    ]);

    const result = await route.generate(request);
    expect(result.attempts).toEqual([
      { providerId: "paid-failing", outcome: "failed" },
      { providerId: "offline", outcome: "selected" },
    ]);
  });

  it("fails closed when offline execution is required but unavailable", async () => {
    const route = new OmniRoute([
      {
        provider: failingProvider(),
        capabilities: ["content.caption"],
        estimatedCostCents: 0,
        priority: 1,
      },
    ]);

    await expect(route.generate(request, { requireOffline: true })).rejects.toBeInstanceOf(
      AiRoutingError,
    );
  });
});
