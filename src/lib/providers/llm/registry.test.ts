import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const originalMode = process.env.CARRYOS_INTEGRATION_MODE;
const originalOpenAiKey = process.env.OPENAI_API_KEY;

beforeEach(() => {
  vi.resetModules();
  delete process.env.CARRYOS_INTEGRATION_MODE;
  delete process.env.OPENAI_API_KEY;
});

afterEach(() => {
  if (originalMode === undefined) delete process.env.CARRYOS_INTEGRATION_MODE;
  else process.env.CARRYOS_INTEGRATION_MODE = originalMode;

  if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalOpenAiKey;
});

describe("LLM provider routing policy", () => {
  it("keeps direct provider configuration available only in STANDALONE mode", async () => {
    process.env.CARRYOS_INTEGRATION_MODE = "STANDALONE";
    process.env.OPENAI_API_KEY = "test-key-not-a-production-secret";
    const { isLlmProviderConfigured } = await import("./registry");

    expect(isLlmProviderConfigured("openai")).toBe(true);
  });

  it("hides direct providers and fails closed in CORE_BOUND mode", async () => {
    process.env.CARRYOS_INTEGRATION_MODE = "CORE_BOUND";
    process.env.OPENAI_API_KEY = "test-key-not-a-production-secret";
    const {
      CarryOsCoreRoutingRequiredError,
      isLlmProviderConfigured,
      resolveScriptProvider,
    } = await import("./registry");

    expect(isLlmProviderConfigured("openai")).toBe(false);
    expect(() => resolveScriptProvider("openai")).toThrow(CarryOsCoreRoutingRequiredError);
    expect(resolveScriptProvider("template").key).toBe("template");
  });
});
