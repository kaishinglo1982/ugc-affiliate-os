/**
 * Approval policy for product decisions (`scale`/`test`/`watch`/`reject` from
 * `product-score.ts`). This module is a pure decision function — it is not
 * wired to any agent, workflow, queue, budget system, campaign system,
 * publishing pipeline or provider in this codebase. It exists so that once
 * something DOES wire a product decision to a live action, that caller has a
 * single, tested gate to consult instead of inventing its own rules.
 *
 * Hard invariant, enforced unconditionally (not configurable by policy):
 * a `scale` decision can never be `autoExecutable`. The only thing a policy
 * can vary is whether `test` may prepare an action automatically, within
 * explicit budget and tool limits.
 */
import type { ProductDecision } from "./types";

export type ProductActionType =
  | "budget_change"
  | "campaign_change"
  | "publishing_action"
  | "provider_action"
  | "data_deletion"
  | "prepare_action"
  | "read_only_observation";

export interface ProductDecisionPolicy {
  tenantId: string;
  /** Whether `test` decisions may auto-prepare an action at all. Default false. */
  allowAutomatedActions: boolean;
  /** Hard ceiling for any `test`-prepared action's budget. Default 0. */
  maxAutomatedBudgetPerAction: number;
  /** Explicit tool allow-list for `test`-prepared actions. Default empty (nothing allowed). */
  allowedToolsForTest: string[];
}

export function defaultProductDecisionPolicy(tenantId: string): ProductDecisionPolicy {
  return {
    tenantId,
    allowAutomatedActions: false,
    maxAutomatedBudgetPerAction: 0,
    allowedToolsForTest: [],
  };
}

export interface ProductActionRequest {
  decision: ProductDecision;
  action: ProductActionType;
  tenantId: string | null | undefined;
  policy: ProductDecisionPolicy | null | undefined;
  budget?: number;
  tool?: string;
}

export type ProductActionDenialReason =
  | "missing_tenant_context"
  | "missing_policy"
  | "tenant_mismatch"
  | "action_not_permitted_for_decision"
  | "automation_disabled"
  | "budget_exceeds_limit"
  | "tool_not_allowlisted";

export interface ProductActionAuthorization {
  /** false = hard stop, nothing may happen. true = the action may proceed IF requiresHumanApproval is satisfied. */
  permitted: boolean;
  /** true = a human approval record is required before this action executes. */
  requiresHumanApproval: boolean;
  /**
   * true only when the action may execute without a human approval step.
   * NEVER true for a `scale` decision on budget_change/campaign_change/
   * publishing_action/provider_action, regardless of policy configuration.
   */
  autoExecutable: boolean;
  reason: string | ProductActionDenialReason;
}

function deny(reason: ProductActionDenialReason): ProductActionAuthorization {
  return { permitted: false, requiresHumanApproval: false, autoExecutable: false, reason };
}

const LIVE_ACTIONS: ProductActionType[] = [
  "budget_change",
  "campaign_change",
  "publishing_action",
  "provider_action",
];

/**
 * Single authorization gate for a product-decision-triggered action.
 * Pure function — callers are responsible for actually enforcing the result;
 * this function has no side effects and calls nothing else.
 */
export function authorizeProductAction(request: ProductActionRequest): ProductActionAuthorization {
  const { decision, action, tenantId, policy } = request;

  if (!tenantId) return deny("missing_tenant_context");
  if (!policy) return deny("missing_policy");
  if (policy.tenantId !== tenantId) return deny("tenant_mismatch");

  switch (decision) {
    case "watch": {
      if (action !== "read_only_observation") return deny("action_not_permitted_for_decision");
      return {
        permitted: true,
        requiresHumanApproval: false,
        autoExecutable: true,
        reason: "watch is strictly read-only",
      };
    }

    case "reject": {
      if (action === "data_deletion") return deny("action_not_permitted_for_decision");
      if (action !== "read_only_observation") return deny("action_not_permitted_for_decision");
      return {
        permitted: true,
        requiresHumanApproval: false,
        autoExecutable: true,
        reason: "reject only permits read-only observation; no automatic deletion",
      };
    }

    case "test": {
      if (action !== "prepare_action") return deny("action_not_permitted_for_decision");
      if (!policy.allowAutomatedActions) return deny("automation_disabled");
      if (request.budget !== undefined && request.budget > policy.maxAutomatedBudgetPerAction) {
        return deny("budget_exceeds_limit");
      }
      if (request.tool !== undefined && !policy.allowedToolsForTest.includes(request.tool)) {
        return deny("tool_not_allowlisted");
      }
      return {
        permitted: true,
        requiresHumanApproval: false,
        autoExecutable: true,
        reason: "test may prepare an action within explicit budget/tool limits",
      };
    }

    case "scale": {
      if (action === "read_only_observation") {
        return {
          permitted: true,
          requiresHumanApproval: false,
          autoExecutable: true,
          reason: "read-only observation is always safe",
        };
      }
      if (LIVE_ACTIONS.includes(action)) {
        return {
          permitted: true,
          requiresHumanApproval: true,
          autoExecutable: false,
          reason: "scale never auto-executes budget, campaign, publishing or provider actions",
        };
      }
      return deny("action_not_permitted_for_decision");
    }
  }
}
