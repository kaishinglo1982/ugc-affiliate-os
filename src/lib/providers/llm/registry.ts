import "server-only";
import type { ScriptProvider } from "@/lib/providers/llm/types";
import { templateScriptProvider } from "@/lib/providers/llm/template-provider";
import { carryOsScriptProvider } from "@/lib/providers/llm/carryos-provider";

export { LLM_PROVIDER_KEYS, type LlmProviderKey } from "./registry-client";
import { LLM_PROVIDER_KEYS, type LlmProviderKey } from "./registry-client";

const ENV_KEY_BY_PROVIDER: Record<LlmProviderKey, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  mistral: "MISTRAL_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  huggingface: "HUGGINGFACE_API_KEY",
  custom: "OPENAI_API_KEY",
};

export function isLlmProviderConfigured(provider: LlmProviderKey): boolean {
  return Boolean(process.env[ENV_KEY_BY_PROVIDER[provider]]);
}

export function resolveScriptProvider(requested: LlmProviderKey | "template"): ScriptProvider {
  if (process.env.CARRYOS_INTEGRATION_MODE === "CORE_BOUND") return carryOsScriptProvider;
  return templateScriptProvider;
}
