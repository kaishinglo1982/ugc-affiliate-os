import {
  AiRequestSchema,
  AiResponseSchema,
  type AiProvider,
  type AiRequest,
  type AiResponse,
} from "@/lib/ai/contracts";

export class AiRoutingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiRoutingError";
  }
}

export interface AiRouterOptions {
  providers: readonly AiProvider[];
  allowOfflineFallback?: boolean;
}

export class AiRouter {
  private readonly providers: readonly AiProvider[];
  private readonly allowOfflineFallback: boolean;

  constructor(options: AiRouterOptions) {
    this.providers = options.providers;
    this.allowOfflineFallback = options.allowOfflineFallback ?? true;

    const ids = new Set<string>();
    for (const provider of this.providers) {
      if (ids.has(provider.id)) {
        throw new AiRoutingError(`Duplicate AI provider id: ${provider.id}`);
      }
      ids.add(provider.id);
    }
  }

  async generate(input: AiRequest): Promise<AiResponse> {
    const request = AiRequestSchema.parse(input);
    const candidates = this.providers.filter(
      (provider) =>
        provider.supports(request.capability) &&
        (this.allowOfflineFallback || !provider.offline),
    );

    for (const provider of candidates) {
      if (!(await provider.isAvailable(request.workspaceId))) {
        continue;
      }

      try {
        return AiResponseSchema.parse(await provider.generate(request));
      } catch (error) {
        if (error instanceof AiRoutingError) {
          throw error;
        }
      }
    }

    throw new AiRoutingError(
      `No available AI provider supports capability "${request.capability}"`,
    );
  }
}
