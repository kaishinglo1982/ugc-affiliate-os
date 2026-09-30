/**
 * Content intelligence provider port + mock adapter. Provider-agnostic: no
 * coupling to any specific AI vendor (Claude/OpenAI/Gemini/Mistral). Budget is
 * estimated before execution and a policy gate decides whether the (mock) call
 * may proceed. Output is structured and Zod-validated. AI-generated variant
 * proposals are stored as DRAFTS only — never published automatically.
 */
import { z } from "zod";
import { classifyConfidence } from "./profile";

export const contentAnalysisResultSchema = z.object({
  hookType: z.string().nullable(),
  scriptStructure: z.string().nullable(),
  callToActionType: z.string().nullable(),
  sentiment: z.enum(["negative", "neutral", "positive", "mixed"]).nullable(),
  pacing: z.enum(["slow", "medium", "fast"]).nullable(),
  productMentionCount: z.number().int().min(0),
  affiliateDisclosurePresent: z.boolean(),
  faceVisible: z.boolean().nullable(),
  confidenceScore: z.number().min(0).max(1),
  modelReference: z.string(),
});

export type ContentAnalysisResult = z.infer<typeof contentAnalysisResultSchema>;

export const variantProposalResultSchema = z.object({
  name: z.string(),
  hookText: z.string().nullable(),
  scriptText: z.string().nullable(),
  captionText: z.string().nullable(),
  callToActionText: z.string().nullable(),
  confidenceScore: z.number().min(0).max(1),
  modelReference: z.string(),
});

export type VariantProposalResult = z.infer<typeof variantProposalResultSchema>;

export interface ContentAnalysisRequest {
  workspaceId: string;
  contentAssetId: string;
  language: string;
}

export interface VariantComparisonRequest {
  workspaceId: string;
  variantIds: string[];
}

export interface VariantProposalRequest {
  workspaceId: string;
  parentContentAssetId: string;
  baseVariantId?: string;
  promptReferenceId?: string;
}

export interface ContentIntelligencePort {
  readonly provider: string;
  estimateCost(request: unknown): Promise<{ estimatedCost: number; currency: string }>;
  analyzeContent(request: ContentAnalysisRequest): Promise<ContentAnalysisResult>;
  compareVariants(request: VariantComparisonRequest): Promise<{ comparison: string; confidenceScore: number }>;
  generateVariantProposal(request: VariantProposalRequest): Promise<VariantProposalResult>;
}

export class MockContentIntelligenceAdapter implements ContentIntelligencePort {
  readonly provider = "mock";

  async estimateCost(_request: unknown): Promise<{ estimatedCost: number; currency: string }> {
    return { estimatedCost: 0.01, currency: "EUR" };
  }

  async analyzeContent(request: ContentAnalysisRequest): Promise<ContentAnalysisResult> {
    return contentAnalysisResultSchema.parse({
      hookType: "CURIOSITY",
      scriptStructure: "HOOK_DEMO_PROOF_CTA",
      callToActionType: "CLICK_LINK",
      sentiment: "positive",
      pacing: "medium",
      productMentionCount: 2,
      affiliateDisclosurePresent: true,
      faceVisible: true,
      confidenceScore: 0.72,
      modelReference: "mock-classifier@1.0.0",
    });
  }

  async compareVariants(request: VariantComparisonRequest): Promise<{ comparison: string; confidenceScore: number }> {
    return {
      comparison: `Vergleich von ${request.variantIds.length} Varianten (Mock).`,
      confidenceScore: 0.6,
    };
  }

  async generateVariantProposal(request: VariantProposalRequest): Promise<VariantProposalResult> {
    return variantProposalResultSchema.parse({
      name: `Vorschlag für ${request.parentContentAssetId}`,
      hookText: "Wusstest du schon, dass …?",
      scriptText: null,
      captionText: "Entdecke mehr über dieses Produkt.",
      callToActionText: "Jetzt mehr erfahren",
      confidenceScore: 0.65,
      modelReference: "mock-generator@1.0.0",
    });
  }
}

export function confidenceLabel(score: number): string {
  return classifyConfidence(score);
}

export function resolveContentIntelligenceProvider(): ContentIntelligencePort {
  if (process.env.CARRYOS_INTEGRATION_MODE === "CORE_BOUND") {
    throw new Error(
      "UGC_AI_PROVIDER_NOT_GOVERNED: content intelligence in CORE_BOUND must execute through CarryOS",
    );
  }

  return new MockContentIntelligenceAdapter();
}
