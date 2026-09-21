import "server-only";

import { LLM_PROVIDER_KEYS, type LlmProviderKey, type ScriptProvider } from "@/lib/providers/llm/types";
import { carryOsScriptProvider } from "@/lib/providers/llm/carryos-provider";
import { templateScriptProvider } from "@/lib/providers/llm/template-provider";

export { LLM_PROVIDER_KEYS };
export type { LlmProviderKey };

const ENV_KEY_BY_PROVIDER: Record<LlmProviderKey, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  mistral: "MISTRAL_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  huggingface: "HUGGINGFACE_API_KEY",
  custom: "OPENAI_API_KEY",
};

function isCoreBound(): boolean {
  return process.env.CARRYOS_INTEGRATION_MODE === "CORE_BOUND";
}

export function isLlmProviderConfigured(provider: LlmProviderKey): boolean {
  if (isCoreBound()) return false;
  return Boolean(process.env[ENV_KEY_BY_PROVIDER[provider]]);
}

/**
 * In CORE_BOUND mode any request that would otherwise select an external LLM
 * is routed through CarryOS Core. The local deterministic template provider is
 * still available for explicitly requested non-AI/offline generation.
 */
export function resolveScriptProvider(requested: LlmProviderKey | "template"): ScriptProvider {
  if (requested === "template") return templateScriptProvider;
  if (isCoreBound()) return carryOsScriptProvider;
  // Direct vendor SDK calls are intentionally not wired in this repository.
  // Standalone remains deterministic until a separately governed provider is implemented.
  return templateScriptProvider;
}
