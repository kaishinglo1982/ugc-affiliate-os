import { describe, expect, it } from "vitest";

import { OfflineAiProvider } from "@/lib/ai/offline-provider";
import { AiRouter, AiRoutingError } from "@/lib/ai/router";

const request = {
  workspaceId: "workspace-test",
  capability: "content.ugc-script" as const,
  prompt: "Eine Trinkflasche hält Getränke zwölf Stunden kalt.",
  temperature: 0,
  maxOutputTokens: 2_000,
  metadata: {},
};

describe("OfflineAiProvider", () => {
  it("creates a deterministic, disclosed UGC script without external calls", async () => {
    const provider = new OfflineAiProvider();
    const first = await provider.generate(request);
    const second = await provider.generate(request);

    expect(first.content).toBe(second.content);
    expect(first.content).toContain("Affiliate-Link");
    expect(first.offline).toBe(true);
    expect(first.usage.estimatedCostCents).toBe(0);
  });

  it("is selected as the zero-cost fallback", async () => {
    const router = new AiRouter({ providers: [new OfflineAiProvider()] });
    const result = await router.generate(request);

    expect(result.provider).toBe("offline");
    expect(result.model).toBe("deterministic-v1");
  });

  it("can be disabled for workflows that require a live provider", async () => {
    const router = new AiRouter({
      providers: [new OfflineAiProvider()],
      allowOfflineFallback: false,
    });

    await expect(router.generate(request)).rejects.toBeInstanceOf(AiRoutingError);
  });
});
