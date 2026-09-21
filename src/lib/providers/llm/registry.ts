import "server-only";

import type { ScriptProvider } from "@/lib/providers/llm/types";
import {
  LLM_PROVIDER_KEYS,
  type LlmProviderKey,
} from "@/lib/providers/llm/types";
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

export class CarryOsCoreRoutingRequiredError extends Error {
  constructor(provider: LlmProviderKey) {
    super(`Direct LLM provider ${provider} is disabled in CORE_BOUND mode; route through CarryOS Core.`);
    this.name = "CarryOsCoreRoutingRequiredError";
  }
}

function isCoreBound(): boolean {
  return process.env.CARRYOS_INTEGRATION_MODE === "CORE_BOUND";
}

export function isLlmProviderConfigured(provider: LlmProviderKey): boolean {
  if (isCoreBound()) return false;
  return Boolean(process.env[ENV_KEY_BY_PROVIDER[provider]]);
}

/**
 * Vendor SDK calls are not wired up yet. STANDALONE keeps the existing safe
 * local-template fallback. CORE_BOUND forbids selecting a direct vendor so
 * CarryOS remains the sole provider/model/budget routing authority.
 */
export function resolveScriptProvider(requested: LlmProviderKey | "template"): ScriptProvider {
  if (isCoreBound() && requested !== "template") {
    throw new CarryOsCoreRoutingRequiredError(requested);
  }
  return templateScriptProvider;
}
