export const LLM_PROVIDER_KEYS = ["openai", "anthropic", "google", "mistral", "openrouter", "huggingface", "custom"] as const;
export type LlmProviderKey = (typeof LLM_PROVIDER_KEYS)[number];
