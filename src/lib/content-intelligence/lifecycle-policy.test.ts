import { describe, expect, it } from "vitest";
import {
  transitionContentState,
  type ContentActor,
  type ContentRecord,
} from "./lifecycle-policy";

const content: ContentRecord = {
  id: "content-1",
  workspaceId: "workspace-a",
  state: "IN_REVIEW",
  version: 4,
  rightsStatus: "CLEARED",
  consentStatus: "GRANTED",
};

const human: ContentActor = {
  id: "user-1",
  workspaceId: "workspace-a",
  type: "HUMAN",
  capabilities: ["content:transition"],
};

describe("content lifecycle policy", () => {
  it("records a human approval and audit event", () => {
    const result = transitionContentState(content, "APPROVED", human);

    expect(result.content.state).toBe("APPROVED");
    expect(result.content.approvedBy).toBe("user-1");
    expect(result.auditEvent.version).toBe(5);
  });

  it("prevents agents from approving content", () => {
    expect(() =>
      transitionContentState(content, "APPROVED", {
        ...human,
        id: "ugc-agent",
        type: "AGENT",
      }),
    ).toThrow("human actor");
  });

  it("denies cross-workspace transitions", () => {
    expect(() =>
      transitionContentState(content, "CHANGES_REQUIRED", {
        ...human,
        workspaceId: "workspace-b",
      }),
    ).toThrow("Cross-workspace");
  });

  it("requires rights before approval", () => {
    expect(() =>
      transitionContentState(
        { ...content, rightsStatus: "UNKNOWN" },
        "APPROVED",
        human,
      ),
    ).toThrow("rights");
  });
});
