import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/providers/llm/carryos-provider", () => ({
  carryOsScriptProvider: {
    key: "carryos-core",
    mode: "LIVE",
    generate: vi.fn(),
  },
}));

const originalMode = process.env.CARRYOS_INTEGRATION_MODE;
const providerEnvKeys = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "MISTRAL_API_KEY",
  "OPENROUTER_API_KEY",
  "HUGGINGFACE_API_KEY",
] as const;
const originalProviderEnv = Object.fromEntries(
  providerEnvKeys.map((key) => [key, process.env[key]]),
) as Record<(typeof providerEnvKeys)[number], string | undefined>;

beforeEach(() => {
  vi.resetModules();
  process.env.CARRYOS_INTEGRATION_MODE = "STANDALONE";
  for (const key of providerEnvKeys) delete process.env[key];
});

afterEach(() => {
  if (originalMode === undefined) delete process.env.CARRYOS_INTEGRATION_MODE;
  else process.env.CARRYOS_INTEGRATION_MODE = originalMode;

  for (const key of providerEnvKeys) {
    const value = originalProviderEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("LLM provider routing policy", () => {
  it("reports direct provider configuration only in STANDALONE mode", async () => {
    process.env.OPENAI_API_KEY = "test-key-not-a-production-secret";
    const { isLlmProviderConfigured } = await import("./registry");
    expect(isLlmProviderConfigured("openai")).toBe(true);
  });

  it("routes every direct provider request through CarryOS in CORE_BOUND mode", async () => {
    process.env.CARRYOS_INTEGRATION_MODE = "CORE_BOUND";
    for (const key of providerEnvKeys) process.env[key] = "test-key-not-a-production-secret";

    const { LLM_PROVIDER_KEYS, isLlmProviderConfigured, resolveScriptProvider } = await import("./registry");
    for (const provider of LLM_PROVIDER_KEYS) {
      expect(isLlmProviderConfigured(provider)).toBe(false);
      expect(resolveScriptProvider(provider).key).toBe("carryos-core");
    }
  });

  it("keeps the explicit deterministic template path local", async () => {
    process.env.CARRYOS_INTEGRATION_MODE = "CORE_BOUND";
    const { resolveScriptProvider } = await import("./registry");
    expect(resolveScriptProvider("template").key).toBe("template");
  });
});
