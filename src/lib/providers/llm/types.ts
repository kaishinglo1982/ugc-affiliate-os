export interface ScriptGenerationRequest {
  productName: string;
  productDescription?: string | null;
  problemSolved?: string | null;
  audience: string;
  platform: string;
  durationSec: number;
  tone: string;
  hookType: string;
  cta: string;
}

export interface GeneratedScript {
  hook: string;
  problem: string;
  situation: string;
  productIntro: string;
  demonstration: string;
  benefit: string;
  socialProof: string;
  objectionHandling: string;
  cta: string;
  onScreenText: string;
  bRollNotes: string;
  voiceover: string;
  sceneList: Array<{ scene: number; description: string; durationSec: number }>;
}

/**
 * Every LLM backend (OpenAI, Anthropic, Google, Mistral, OpenRouter, custom
 * OpenAI-compatible endpoint) implements this. The UGC Script Studio always
 * works without any of them via the local TemplateScriptProvider.
 */
export interface ScriptProvider {
  readonly key: string;
  readonly mode: "LIVE" | "MOCK";
  generate(request: ScriptGenerationRequest): Promise<GeneratedScript>;
}
