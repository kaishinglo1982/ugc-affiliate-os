import "server-only";
import { prisma } from "@/lib/db/client";
import type {
  ProviderCapability,
  ProviderHealthStatus,
  ProviderRoutingStrategy,
} from "@/generated/prisma/client";

export type ProviderPolicyInput = {
  name: string;
  capability: ProviderCapability;
  strategy: ProviderRoutingStrategy;
  enabled: boolean;
  allowedProviderKeys: string[];
  deniedProviderKeys: string[];
  fallbackProviderKeys: string[];
  premiumRequiresApproval: boolean;
  maxCostPerCall?: number;
  dailyBudget?: number;
  regionAllowList: string[];
};

export async function listProviderPolicies(
  workspaceId: string,
  filters: { capability?: ProviderCapability; enabled?: boolean } = {},
) {
  return prisma.providerRoutingPolicy.findMany({
    where: {
      workspaceId,
      ...(filters.capability ? { capability: filters.capability } : {}),
      ...(filters.enabled !== undefined ? { enabled: filters.enabled } : {}),
    },
    orderBy: [{ capability: "asc" }, { name: "asc" }],
  });
}

export async function createProviderPolicy(
  workspaceId: string,
  input: ProviderPolicyInput,
) {
  const overlap = input.allowedProviderKeys.filter((key) =>
    input.deniedProviderKeys.includes(key),
  );
  if (overlap.length > 0) throw new Error("PROVIDER_POLICY_CONFLICT");

  return prisma.providerRoutingPolicy.create({
    data: { workspaceId, ...input },
  });
}

export type ProviderCandidate = {
  providerKey: string;
  modelKey?: string;
  capability: ProviderCapability;
  estimatedCost: number;
  qualityScore: number;
  region?: string;
  premium: boolean;
};

export type ProviderRouteDecision = {
  providerKey: string;
  modelKey?: string;
  policyId: string;
  strategy: ProviderRoutingStrategy;
  requiresApproval: boolean;
  reason: string;
};

export async function selectProvider(
  workspaceId: string,
  capability: ProviderCapability,
  candidates: ProviderCandidate[],
): Promise<ProviderRouteDecision> {
  const policy = await prisma.providerRoutingPolicy.findFirst({
    where: { workspaceId, capability, enabled: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!policy) throw new Error("PROVIDER_POLICY_NOT_FOUND");

  const integrations = await prisma.integration.findMany({
    where: { workspaceId, status: "CONNECTED" },
    select: { providerKey: true },
  });
  const connected = new Set(integrations.map((item) => item.providerKey));

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const spend = await prisma.providerUsageRecord.aggregate({
    where: { workspaceId, capability, createdAt: { gte: today } },
    _sum: { estimatedCost: true },
  });
  const spentToday = Number(spend._sum.estimatedCost?.toString() ?? "0");

  const eligible: ProviderCandidate[] = [];
  for (const candidate of candidates) {
    if (candidate.capability !== capability) continue;
    if (!connected.has(candidate.providerKey)) continue;
    if (policy.deniedProviderKeys.includes(candidate.providerKey)) continue;
    if (
      policy.allowedProviderKeys.length > 0 &&
      !policy.allowedProviderKeys.includes(candidate.providerKey)
    ) continue;
    if (
      policy.regionAllowList.length > 0 &&
      (!candidate.region || !policy.regionAllowList.includes(candidate.region))
    ) continue;
    if (
      policy.maxCostPerCall !== null &&
      candidate.estimatedCost > Number(policy.maxCostPerCall)
    ) continue;
    if (
      policy.dailyBudget !== null &&
      spentToday + candidate.estimatedCost > Number(policy.dailyBudget)
    ) continue;

    const health = await prisma.providerHealthCheck.findFirst({
      where: { workspaceId, providerKey: candidate.providerKey },
      orderBy: { checkedAt: "desc" },
      select: { status: true },
    });
    if (health && ["UNAVAILABLE", "DISABLED"].includes(health.status)) continue;
    eligible.push(candidate);
  }
  if (eligible.length === 0) throw new Error("NO_ELIGIBLE_PROVIDER");

  const fallbackRank = new Map(
    policy.fallbackProviderKeys.map((key, index) => [key, index]),
  );
  eligible.sort((left, right) => {
    if (policy.strategy === "QUALITY_FIRST") {
      return right.qualityScore - left.qualityScore || left.estimatedCost - right.estimatedCost;
    }
    if (policy.strategy === "MANUAL") {
      return (fallbackRank.get(left.providerKey) ?? 999) - (fallbackRank.get(right.providerKey) ?? 999);
    }
    if (policy.strategy === "FREE_FIRST") {
      return Number(left.estimatedCost > 0) - Number(right.estimatedCost > 0) || left.estimatedCost - right.estimatedCost;
    }
    return left.estimatedCost - right.estimatedCost || right.qualityScore - left.qualityScore;
  });

  const selected = eligible[0];
  if (!selected) throw new Error("NO_ELIGIBLE_PROVIDER");
  return {
    providerKey: selected.providerKey,
    modelKey: selected.modelKey,
    policyId: policy.id,
    strategy: policy.strategy,
    requiresApproval: selected.premium && policy.premiumRequiresApproval,
    reason: `${policy.strategy} selected ${selected.providerKey}; daily spend ${spentToday.toFixed(4)}`,
  };
}

export async function recordProviderHealth(
  workspaceId: string,
  input: {
    providerKey: string;
    status: ProviderHealthStatus;
    latencyMs?: number;
    errorCode?: string;
  },
) {
  return prisma.providerHealthCheck.create({ data: { workspaceId, ...input } });
}


export type ProviderUsageInput = {
  providerKey: string;
  capability: ProviderCapability;
  modelKey?: string;
  requestId?: string;
  inputUnits: number;
  outputUnits: number;
  estimatedCost: number;
  currency: string;
  success: boolean;
  latencyMs?: number;
  errorCode?: string;
};

export async function recordProviderUsage(
  workspaceId: string,
  input: ProviderUsageInput,
) {
  const integration = await prisma.integration.findFirst({
    where: {
      workspaceId,
      providerKey: input.providerKey,
      status: "CONNECTED",
    },
    select: { id: true },
  });
  if (!integration) throw new Error("PROVIDER_CONNECTION_NOT_FOUND");

  const usage = await prisma.providerUsageRecord.create({
    data: { workspaceId, ...input },
  });

  if (!input.success) {
    const recent = await prisma.providerUsageRecord.findMany({
      where: { workspaceId, providerKey: input.providerKey },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { success: true },
    });
    if (recent.length >= 3 && recent.slice(0, 3).every((item) => !item.success)) {
      await recordProviderHealth(workspaceId, {
        providerKey: input.providerKey,
        status: "UNAVAILABLE",
        latencyMs: input.latencyMs,
        errorCode: input.errorCode ?? "CIRCUIT_OPEN",
      });
    }
  }

  return usage;
}
