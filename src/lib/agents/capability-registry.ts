import { z } from "zod";

export const agentHealthSchema = z.enum(["ONLINE", "DEGRADED", "OFFLINE", "MAINTENANCE"]);
export const routingStrategySchema = z.enum([
  "DETERMINISTIC",
  "LEAST_LOADED",
  "LOWEST_COST",
  "FASTEST",
  "HIGHEST_SUCCESS_RATE",
]);

export const agentCapabilitySchema = z.object({
  key: z.string().min(1).max(120),
  version: z.number().int().positive(),
  tools: z.array(z.string().min(1)).default([]),
  inputSchemaVersion: z.string().min(1).default("1"),
  outputSchemaVersion: z.string().min(1).default("1"),
});

export const registeredAgentSchema = z.object({
  workspaceId: z.string().min(1),
  agentKey: z.string().min(1).max(120),
  version: z.number().int().positive(),
  enabled: z.boolean().default(true),
  health: agentHealthSchema.default("ONLINE"),
  capabilities: z.array(agentCapabilitySchema).min(1),
  allowedToolKeys: z.array(z.string().min(1)).default([]),
  providerKeys: z.array(z.string().min(1)).default([]),
  currentLoad: z.number().int().nonnegative().default(0),
  maxConcurrency: z.number().int().positive().default(1),
  estimatedCostPerTask: z.number().nonnegative().default(0),
  averageLatencyMs: z.number().nonnegative().default(0),
  successRate: z.number().min(0).max(1).default(1),
  priority: z.number().int().default(0),
});

export type RegisteredAgent = z.infer<typeof registeredAgentSchema>;
export type RoutingStrategy = z.infer<typeof routingStrategySchema>;

export interface AgentTaskRequest {
  workspaceId: string;
  capabilityKey: string;
  minimumCapabilityVersion?: number;
  requiredToolKeys?: string[];
  requiredProviderKeys?: string[];
  strategy?: RoutingStrategy;
}

export interface AgentRoutingDecision {
  agent: RegisteredAgent;
  eligibleAgentKeys: string[];
  strategy: RoutingStrategy;
  reason: string;
}

export class NoEligibleAgentError extends Error {
  constructor(capabilityKey: string) {
    super(`No eligible agent found for capability ${capabilityKey}.`);
    this.name = "NoEligibleAgentError";
  }
}

export class AgentCapabilityRegistry {
  private readonly agents = new Map<string, RegisteredAgent>();

  register(input: unknown): RegisteredAgent {
    const agent = registeredAgentSchema.parse(input);
    this.agents.set(this.registryKey(agent.workspaceId, agent.agentKey), agent);
    return agent;
  }

  unregister(workspaceId: string, agentKey: string): void {
    this.agents.delete(this.registryKey(workspaceId, agentKey));
  }

  list(workspaceId: string): RegisteredAgent[] {
    return [...this.agents.values()]
      .filter((agent) => agent.workspaceId === workspaceId)
      .sort((a, b) => a.agentKey.localeCompare(b.agentKey));
  }

  route(request: AgentTaskRequest): AgentRoutingDecision {
    const strategy = request.strategy ?? "DETERMINISTIC";
    const requiredTools = new Set(request.requiredToolKeys ?? []);
    const requiredProviders = new Set(request.requiredProviderKeys ?? []);

    const eligible = this.list(request.workspaceId).filter((agent) => {
      if (!agent.enabled || agent.health !== "ONLINE") return false;
      if (agent.currentLoad >= agent.maxConcurrency) return false;

      const capability = agent.capabilities.find(
        (item) =>
          item.key === request.capabilityKey &&
          item.version >= (request.minimumCapabilityVersion ?? 1),
      );
      if (!capability) return false;

      const supportedTools = new Set([...agent.allowedToolKeys, ...capability.tools]);
      if ([...requiredTools].some((tool) => !supportedTools.has(tool))) return false;
      if ([...requiredProviders].some((provider) => !agent.providerKeys.includes(provider))) {
        return false;
      }
      return true;
    });

    if (eligible.length === 0) throw new NoEligibleAgentError(request.capabilityKey);

    const sorted = [...eligible].sort((a, b) => this.compareAgents(a, b, strategy));
    const selected = sorted[0];

    return {
      agent: selected,
      eligibleAgentKeys: sorted.map((agent) => agent.agentKey),
      strategy,
      reason: this.reasonFor(strategy, selected),
    };
  }

  private compareAgents(a: RegisteredAgent, b: RegisteredAgent, strategy: RoutingStrategy): number {
    const stable = (): number =>
      b.priority - a.priority || a.agentKey.localeCompare(b.agentKey) || b.version - a.version;

    switch (strategy) {
      case "LEAST_LOADED":
        return a.currentLoad - b.currentLoad || stable();
      case "LOWEST_COST":
        return a.estimatedCostPerTask - b.estimatedCostPerTask || stable();
      case "FASTEST":
        return a.averageLatencyMs - b.averageLatencyMs || stable();
      case "HIGHEST_SUCCESS_RATE":
        return b.successRate - a.successRate || stable();
      case "DETERMINISTIC":
      default:
        return stable();
    }
  }

  private reasonFor(strategy: RoutingStrategy, agent: RegisteredAgent): string {
    return `${strategy}: selected ${agent.agentKey}@${agent.version} with priority ${agent.priority}.`;
  }

  private registryKey(workspaceId: string, agentKey: string): string {
    return `${workspaceId}:${agentKey}`;
  }
}
