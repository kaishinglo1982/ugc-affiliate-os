export type AiDataClass = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";

export interface ProviderDataPolicy {
  providerId: string;
  acceptedDataClasses: readonly AiDataClass[];
  qualityScore: number;
}

export interface ProviderDataRequirement {
  dataClass: AiDataClass;
  minimumQualityScore?: number;
}

export function assertProviderDataPolicy(
  policy: ProviderDataPolicy,
  requirement: ProviderDataRequirement,
): void {
  if (!policy.providerId.trim()) {
    throw new Error("Provider policy requires a providerId");
  }

  if (!policy.acceptedDataClasses.includes(requirement.dataClass)) {
    throw new Error(
      `Provider ${policy.providerId} cannot process ${requirement.dataClass} data`,
    );
  }

  const minimumQualityScore = requirement.minimumQualityScore ?? 0;
  if (policy.qualityScore < minimumQualityScore) {
    throw new Error(
      `Provider ${policy.providerId} does not meet the minimum quality score`,
    );
  }
}

export function filterEligibleProviders(
  policies: readonly ProviderDataPolicy[],
  requirement: ProviderDataRequirement,
): ProviderDataPolicy[] {
  return policies.filter((policy) => {
    try {
      assertProviderDataPolicy(policy, requirement);
      return true;
    } catch {
      return false;
    }
  });
}
