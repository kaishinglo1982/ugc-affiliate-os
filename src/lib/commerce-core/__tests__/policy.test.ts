import { describe, expect, it } from "vitest";
import {
  authorizeProductAction,
  defaultProductDecisionPolicy,
  type ProductActionType,
} from "@/lib/commerce-core/policy";
import type { ProductDecision } from "@/lib/commerce-core/types";

const LIVE_ACTIONS: ProductActionType[] = [
  "budget_change",
  "campaign_change",
  "publishing_action",
  "provider_action",
];

const ALL_DECISIONS: ProductDecision[] = ["scale", "test", "watch", "reject"];
const ALL_ACTIONS: ProductActionType[] = [
  ...LIVE_ACTIONS,
  "data_deletion",
  "prepare_action",
  "read_only_observation",
];

describe("authorizeProductAction — tenant context", () => {
  it("denies every decision/action combination when tenantId is missing", () => {
    const policy = defaultProductDecisionPolicy("tenant-1");
    for (const decision of ALL_DECISIONS) {
      for (const action of ALL_ACTIONS) {
        const result = authorizeProductAction({ decision, action, tenantId: null, policy });
        expect(result.permitted).toBe(false);
        expect(result.autoExecutable).toBe(false);
        expect(result.reason).toBe("missing_tenant_context");
      }
    }
  });

  it("denies when the policy belongs to a different tenant", () => {
    const policy = defaultProductDecisionPolicy("tenant-a");
    const result = authorizeProductAction({
      decision: "watch",
      action: "read_only_observation",
      tenantId: "tenant-b",
      policy,
    });
    expect(result.permitted).toBe(false);
    expect(result.reason).toBe("tenant_mismatch");
  });
});

describe("authorizeProductAction — default-deny without a policy", () => {
  it("denies every decision/action combination when no policy record exists", () => {
    for (const decision of ALL_DECISIONS) {
      for (const action of ALL_ACTIONS) {
        const result = authorizeProductAction({ decision, action, tenantId: "tenant-1", policy: null });
        expect(result.permitted).toBe(false);
        expect(result.autoExecutable).toBe(false);
        expect(result.reason).toBe("missing_policy");
      }
    }
  });

  it("denies test actions by default even with a valid policy record (allowAutomatedActions defaults to false)", () => {
    const policy = defaultProductDecisionPolicy("tenant-1");
    const result = authorizeProductAction({
      decision: "test",
      action: "prepare_action",
      tenantId: "tenant-1",
      policy,
    });
    expect(result.permitted).toBe(false);
    expect(result.reason).toBe("automation_disabled");
  });
});

describe("authorizeProductAction — scale never auto-executes", () => {
  it("never returns autoExecutable:true for scale on any action with a real effect, for any policy configuration", () => {
    const permissivePolicy = {
      tenantId: "tenant-1",
      allowAutomatedActions: true,
      maxAutomatedBudgetPerAction: 1_000_000,
      allowedToolsForTest: ["anything"],
    };
    // read_only_observation is intentionally excluded: it has no effect and
    // is the one action `scale` may execute without approval (see the
    // "watch stays read-only" and "scale" cases below for the full matrix).
    const actionsWithEffect = ALL_ACTIONS.filter((action) => action !== "read_only_observation");
    for (const action of actionsWithEffect) {
      const result = authorizeProductAction({
        decision: "scale",
        action,
        tenantId: "tenant-1",
        policy: permissivePolicy,
      });
      expect(result.autoExecutable).toBe(false);
    }
  });

  it("requires human approval for scale on every live-action type", () => {
    const policy = defaultProductDecisionPolicy("tenant-1");
    for (const action of LIVE_ACTIONS) {
      const result = authorizeProductAction({ decision: "scale", action, tenantId: "tenant-1", policy });
      expect(result.permitted).toBe(true);
      expect(result.requiresHumanApproval).toBe(true);
      expect(result.autoExecutable).toBe(false);
    }
  });

  it("denies scale from ever authorizing data deletion", () => {
    const policy = defaultProductDecisionPolicy("tenant-1");
    const result = authorizeProductAction({
      decision: "scale",
      action: "data_deletion",
      tenantId: "tenant-1",
      policy,
    });
    expect(result.permitted).toBe(false);
  });
});

describe("authorizeProductAction — reject never auto-deletes", () => {
  it("denies data_deletion for reject regardless of policy", () => {
    const permissivePolicy = {
      tenantId: "tenant-1",
      allowAutomatedActions: true,
      maxAutomatedBudgetPerAction: 1_000_000,
      allowedToolsForTest: ["anything"],
    };
    const result = authorizeProductAction({
      decision: "reject",
      action: "data_deletion",
      tenantId: "tenant-1",
      policy: permissivePolicy,
    });
    expect(result.permitted).toBe(false);
    expect(result.autoExecutable).toBe(false);
  });

  it("permits reject only for read-only observation", () => {
    const policy = defaultProductDecisionPolicy("tenant-1");
    const readOnly = authorizeProductAction({
      decision: "reject",
      action: "read_only_observation",
      tenantId: "tenant-1",
      policy,
    });
    expect(readOnly.permitted).toBe(true);

    for (const action of [...LIVE_ACTIONS, "prepare_action" as ProductActionType]) {
      const result = authorizeProductAction({ decision: "reject", action, tenantId: "tenant-1", policy });
      expect(result.permitted).toBe(false);
    }
  });
});

describe("authorizeProductAction — test stays within explicit budget/tool limits", () => {
  const boundedPolicy = {
    tenantId: "tenant-1",
    allowAutomatedActions: true,
    maxAutomatedBudgetPerAction: 100,
    allowedToolsForTest: ["draft-variant-tool"],
  };

  it("permits prepare_action within budget and an allow-listed tool", () => {
    const result = authorizeProductAction({
      decision: "test",
      action: "prepare_action",
      tenantId: "tenant-1",
      policy: boundedPolicy,
      budget: 50,
      tool: "draft-variant-tool",
    });
    expect(result.permitted).toBe(true);
    expect(result.autoExecutable).toBe(true);
  });

  it("denies prepare_action over the budget ceiling", () => {
    const result = authorizeProductAction({
      decision: "test",
      action: "prepare_action",
      tenantId: "tenant-1",
      policy: boundedPolicy,
      budget: 101,
    });
    expect(result.permitted).toBe(false);
    expect(result.reason).toBe("budget_exceeds_limit");
  });

  it("denies prepare_action with a tool not on the allow-list", () => {
    const result = authorizeProductAction({
      decision: "test",
      action: "prepare_action",
      tenantId: "tenant-1",
      policy: boundedPolicy,
      tool: "unlisted-tool",
    });
    expect(result.permitted).toBe(false);
    expect(result.reason).toBe("tool_not_allowlisted");
  });

  it("never permits test to touch a live action type directly", () => {
    for (const action of LIVE_ACTIONS) {
      const result = authorizeProductAction({ decision: "test", action, tenantId: "tenant-1", policy: boundedPolicy });
      expect(result.permitted).toBe(false);
    }
  });
});

describe("authorizeProductAction — watch stays read-only", () => {
  it("permits only read_only_observation for watch", () => {
    const policy = defaultProductDecisionPolicy("tenant-1");
    const readOnly = authorizeProductAction({
      decision: "watch",
      action: "read_only_observation",
      tenantId: "tenant-1",
      policy,
    });
    expect(readOnly.permitted).toBe(true);
    expect(readOnly.autoExecutable).toBe(true);
    expect(readOnly.requiresHumanApproval).toBe(false);

    for (const action of [...LIVE_ACTIONS, "data_deletion" as ProductActionType, "prepare_action" as ProductActionType]) {
      const result = authorizeProductAction({ decision: "watch", action, tenantId: "tenant-1", policy });
      expect(result.permitted).toBe(false);
    }
  });
});
