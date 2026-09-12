import { createHash, randomUUID } from "node:crypto";

import {
  AiRequestSchema,
  type AiCapability,
  type AiProvider,
  type AiRequest,
  type AiResponse,
} from "@/lib/ai/contracts";

const ALL_OFFLINE_CAPABILITIES: ReadonlySet<AiCapability> = new Set([
  "text.generate",
  "text.structure",
  "content.ugc-script",
  "content.caption",
  "product.score",
]);

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function short(value: string, limit = 180): string {
  const normalized = normalize(value);
  return normalized.length <= limit ? normalized : `${normalized.slice(0, limit - 1)}…`;
}

function stableScore(prompt: string): number {
  const digest = createHash("sha256").update(prompt).digest();
  return 50 + (digest[0] % 41);
}

function render(request: AiRequest): string {
  const subject = short(request.prompt);

  switch (request.capability) {
    case "content.ugc-script":
      return [
        "HOOK: Dieses Problem kostet im Alltag unnötig Zeit.",
        `PROBLEM: ${subject}`,
        "SZENE 1: Problem in einer glaubwürdigen Alltagssituation zeigen.",
        "SZENE 2: Produkt und Anwendung sachlich demonstrieren.",
        "SZENE 3: Ergebnis mit überprüfbaren Produktfakten erklären.",
        "SZENE 4: Klare Handlungsaufforderung mit Werbekennzeichnung.",
        "DISCLOSURE: Werbung · Affiliate-Link",
      ].join("\n");
    case "content.caption":
      return `${subject}\n\nWerbung · Affiliate-Link\n#ugc #produkttest #affiliate`;
    case "product.score":
      return JSON.stringify({
        score: stableScore(request.prompt),
        confidence: 0.5,
        source: "deterministic-offline-baseline",
        requiresHumanReview: true,
      });
    case "text.structure":
      return JSON.stringify({
        summary: subject,
        facts: [],
        assumptions: [],
        requiresHumanReview: true,
      });
    case "text.generate":
      return subject;
  }
}

export class OfflineAiProvider implements AiProvider {
  readonly id = "offline";
  readonly offline = true;

  supports(capability: AiCapability): boolean {
    return ALL_OFFLINE_CAPABILITIES.has(capability);
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async generate(input: AiRequest): Promise<AiResponse> {
    const request = AiRequestSchema.parse(input);
    const content = render(request);

    return {
      provider: this.id,
      model: "deterministic-v1",
      content,
      finishReason: "stop",
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostCents: 0,
      },
      traceId: randomUUID(),
      offline: true,
    };
  }
}
