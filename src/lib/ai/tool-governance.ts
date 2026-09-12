export type ToolSideEffect = "none" | "write" | "publish" | "spend";

export interface ToolPolicy {
  toolId: string;
  maximumCallsPerRun: number;
  timeoutMs: number;
  sideEffect: ToolSideEffect;
  approvalRequired: boolean;
}

export interface AgentToolGrant {
  agentId: string;
  toolIds: readonly string[];
}

export interface ToolAuthorizationRequest {
  workspaceId: string;
  agentId: string;
  toolId: string;
  currentCalls: number;
  humanApproval: boolean;
}

export class AgentToolGovernance {
  private readonly grants: Map<string, Set<string>>;
  private readonly policies: Map<string, ToolPolicy>;

  constructor(
    grants: readonly AgentToolGrant[],
    policies: readonly ToolPolicy[],
  ) {
    this.grants = new Map(
      grants.map((grant) => [grant.agentId, new Set(grant.toolIds)]),
    );
    this.policies = new Map(policies.map((policy) => [policy.toolId, policy]));
  }

  authorize(request: ToolAuthorizationRequest): ToolPolicy {
    if (!request.workspaceId.trim()) {
      throw new Error("Tool authorization requires a workspaceId");
    }

    const policy = this.policies.get(request.toolId);
    const allowedTools = this.grants.get(request.agentId);

    if (!policy || !allowedTools?.has(request.toolId)) {
      throw new Error("Tool access denied by default");
    }

    if (request.currentCalls >= policy.maximumCallsPerRun) {
      throw new Error("Tool call limit exceeded");
    }

    if (policy.approvalRequired && !request.humanApproval) {
      throw new Error("Human approval required");
    }

    return policy;
  }
}
