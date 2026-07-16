import { describe, expect, it } from "vitest";

import {
  AgentCapabilityRegistry,
  NoEligibleAgentError,
} from "@/lib/agents/capability-registry";

function agent(overrides: Record<string, unknown> = {}) {
  return {
    workspaceId: "workspace-a",
    agentKey: "agent-a",
    version: 1,
    enabled: true,
    health: "ONLINE",
    capabilities: [{ key: "content.research", version: 1, tools: ["search"] }],
    allowedToolKeys: ["search"],
    providerKeys: ["openrouter"],
    currentLoad: 0,
    maxConcurrency: 2,
    estimatedCostPerTask: 0.02,
    averageLatencyMs: 500,
    successRate: 0.95,
    priority: 10,
    ...overrides,
  };
}

describe("AgentCapabilityRegistry", () => {
  it("routes deterministically for identical inputs", () => {
    const registry = new AgentCapabilityRegistry();
    registry.register(agent({ agentKey: "agent-b", priority: 10 }));
    registry.register(agent({ agentKey: "agent-a", priority: 10 }));

    const request = { workspaceId: "workspace-a", capabilityKey: "content.research" };
    expect(registry.route(request).agent.agentKey).toBe("agent-a");
    expect(registry.route(request).agent.agentKey).toBe("agent-a");
  });

  it("never routes across workspaces", () => {
    const registry = new AgentCapabilityRegistry();
    registry.register(agent({ workspaceId: "workspace-b" }));

    expect(() =>
      registry.route({ workspaceId: "workspace-a", capabilityKey: "content.research" }),
    ).toThrow(NoEligibleAgentError);
  });

  it("rejects offline, disabled and saturated agents", () => {
    const registry = new AgentCapabilityRegistry();
    registry.register(agent({ agentKey: "offline", health: "OFFLINE" }));
    registry.register(agent({ agentKey: "disabled", enabled: false }));
    registry.register(agent({ agentKey: "busy", currentLoad: 2, maxConcurrency: 2 }));

    expect(() =>
      registry.route({ workspaceId: "workspace-a", capabilityKey: "content.research" }),
    ).toThrow(NoEligibleAgentError);
  });

  it("enforces capability version, tools and providers", () => {
    const registry = new AgentCapabilityRegistry();
    registry.register(agent());

    expect(() =>
      registry.route({
        workspaceId: "workspace-a",
        capabilityKey: "content.research",
        minimumCapabilityVersion: 2,
      }),
    ).toThrow(NoEligibleAgentError);

    expect(() =>
      registry.route({
        workspaceId: "workspace-a",
        capabilityKey: "content.research",
        requiredToolKeys: ["publish"],
      }),
    ).toThrow(NoEligibleAgentError);

    expect(() =>
      registry.route({
        workspaceId: "workspace-a",
        capabilityKey: "content.research",
        requiredProviderKeys: ["anthropic"],
      }),
    ).toThrow(NoEligibleAgentError);
  });

  it("supports cost, latency, load and success-rate strategies", () => {
    const registry = new AgentCapabilityRegistry();
    registry.register(
      agent({
        agentKey: "cheap",
        estimatedCostPerTask: 0.01,
        averageLatencyMs: 900,
        currentLoad: 1,
        successRate: 0.9,
      }),
    );
    registry.register(
      agent({
        agentKey: "fast",
        estimatedCostPerTask: 0.04,
        averageLatencyMs: 100,
        currentLoad: 0,
        successRate: 0.99,
      }),
    );

    const base = { workspaceId: "workspace-a", capabilityKey: "content.research" };
    expect(registry.route({ ...base, strategy: "LOWEST_COST" }).agent.agentKey).toBe("cheap");
    expect(registry.route({ ...base, strategy: "FASTEST" }).agent.agentKey).toBe("fast");
    expect(registry.route({ ...base, strategy: "LEAST_LOADED" }).agent.agentKey).toBe("fast");
    expect(registry.route({ ...base, strategy: "HIGHEST_SUCCESS_RATE" }).agent.agentKey).toBe("fast");
  });
});
