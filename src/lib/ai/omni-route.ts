import { z } from "zod";

import {
  AiRequestSchema,
  AiResponseSchema,
  type AiCapability,
  type AiProvider,
  type AiRequest,
  type AiResponse,
} from "@/lib/ai/contracts";
import { AiRoutingError } from "@/lib/ai/router";

export const AiRoutePolicySchema = z.object({
  maximumEstimatedCostCents: z.number().nonnegative().default(0),
  requireOffline: z.boolean().default(false),
  preferredProviderIds: z.array(z.string().min(1)).default([]),
  blockedProviderIds: z.array(z.string().min(1)).default([]),
  allowFallback: z.boolean().default(true),
});

export type AiRoutePolicy = z.infer<typeof AiRoutePolicySchema>;

export interface AiProviderProfile {
  provider: AiProvider;
  capabilities: readonly AiCapability[];
  estimatedCostCents: number;
  priority: number;
}

export interface AiRouteAttempt {
  providerId: string;
  outcome: "unavailable" | "failed" | "selected";
}

export interface AiRouteResult {
  response: AiResponse;
  attempts: readonly AiRouteAttempt[];
}

function preferenceIndex(providerId: string, preferred: readonly string[]): number {
  const index = preferred.indexOf(providerId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export class OmniRoute {
  constructor(private readonly profiles: readonly AiProviderProfile[]) {}

  async generate(input: AiRequest, policyInput: Partial<AiRoutePolicy> = {}): Promise<AiRouteResult> {
    const request = AiRequestSchema.parse(input);
    const policy = AiRoutePolicySchema.parse(policyInput);
    const blocked = new Set(policy.blockedProviderIds);

    const candidates = this.profiles
      .filter(({ provider, capabilities, estimatedCostCents }) =>
        !blocked.has(provider.id) &&
        provider.supports(request.capability) &&
        capabilities.includes(request.capability) &&
        estimatedCostCents <= policy.maximumEstimatedCostCents &&
        (!policy.requireOffline || provider.offline),
      )
      .sort((left, right) => {
        const preferred =
          preferenceIndex(left.provider.id, policy.preferredProviderIds) -
          preferenceIndex(right.provider.id, policy.preferredProviderIds);
        return preferred || left.priority - right.priority || left.estimatedCostCents - right.estimatedCostCents;
      });

    const attempts: AiRouteAttempt[] = [];
    for (const { provider } of candidates) {
      if (!(await provider.isAvailable(request.workspaceId))) {
        attempts.push({ providerId: provider.id, outcome: "unavailable" });
        continue;
      }

      try {
        const response = AiResponseSchema.parse(await provider.generate(request));
        attempts.push({ providerId: provider.id, outcome: "selected" });
        return { response, attempts };
      } catch {
        attempts.push({ providerId: provider.id, outcome: "failed" });
        if (!policy.allowFallback) {
          break;
        }
      }
    }

    throw new AiRoutingError(
      `No policy-compliant provider supports capability "${request.capability}"`,
    );
  }
}
