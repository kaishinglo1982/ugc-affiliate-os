import type { ScriptProvider } from "@/lib/providers/llm/types";
import { templateScriptProvider } from "@/lib/providers/llm/template-provider";

export const LLM_PROVIDER_KEYS = ["openai", "anthropic", "google", "mistral", "openrouter", "huggingface", "custom"] as const;
export type LlmProviderKey = (typeof LLM_PROVIDER_KEYS)[number];

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

/** Vendor SDK calls are not wired up yet (see docs/build-report.md "Known
 * limitations") — configured providers are reported as available in the UI,
 * but generation always runs through the local template provider so the
 * studio never makes an unexpected paid call. */
export function resolveScriptProvider(_requested: LlmProviderKey | "template"): ScriptProvider {
  return templateScriptProvider;
}
