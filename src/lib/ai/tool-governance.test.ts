import { describe, expect, it } from "vitest";
import { AgentToolGovernance } from "./tool-governance";

const governance = new AgentToolGovernance(
  [{ agentId: "ugc-producer", toolIds: ["draft-script", "publish-post"] }],
  [
    {
      toolId: "draft-script",
      maximumCallsPerRun: 5,
      timeoutMs: 30_000,
      sideEffect: "write",
      approvalRequired: false,
    },
    {
      toolId: "publish-post",
      maximumCallsPerRun: 1,
      timeoutMs: 30_000,
      sideEffect: "publish",
      approvalRequired: true,
    },
  ],
);

describe("agent tool governance", () => {
  it("denies tools without an explicit grant", () => {
    expect(() =>
      governance.authorize({
        workspaceId: "workspace-a",
        agentId: "ugc-producer",
        toolId: "spend-budget",
        currentCalls: 0,
        humanApproval: true,
      }),
    ).toThrow("denied by default");
  });

  it("requires approval for publishing", () => {
    expect(() =>
      governance.authorize({
        workspaceId: "workspace-a",
        agentId: "ugc-producer",
        toolId: "publish-post",
        currentCalls: 0,
        humanApproval: false,
      }),
    ).toThrow("Human approval");
  });

  it("enforces per-run call limits", () => {
    expect(() =>
      governance.authorize({
        workspaceId: "workspace-a",
        agentId: "ugc-producer",
        toolId: "draft-script",
        currentCalls: 5,
        humanApproval: false,
      }),
    ).toThrow("limit exceeded");
  });
});
