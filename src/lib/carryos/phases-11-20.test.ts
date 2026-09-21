import { describe, expect, it } from "vitest";
import {
  autonomyPolicySchema,
  brandPolicySchema,
  accountPolicySchema,
  memoryWriteSchema,
  extensionGrantSchema,
  clientPolicySchema,
  moduleBridgeSchema,
  canExecuteAutonomousAction,
  canPublishForAccount,
  canWriteMemory,
  canInstallExtension,
  canOperateClient,
  canCrossModuleCall,
  isWorkflowGraphStructurallySafe,
} from "./phases-11-20";

describe("CarryOS UGC phases 11-20 governance contracts", () => {
  it("blocks autonomous spend when approval or kill switch is active", () => {
    const policy = autonomyPolicySchema.parse({
      level: "L3", decisionClass: "OPTIMIZATION", requiresApproval: false,
      maxSpendMinor: 5000, allowedTools: ["analytics.read"], allowedScopes: ["brand:read"],
      killSwitchEnabled: false,
    });
    expect(canExecuteAutonomousAction(policy, 5000)).toBe(true);
    expect(canExecuteAutonomousAction({ ...policy, requiresApproval: true }, 100)).toBe(false);
    expect(canExecuteAutonomousAction({ ...policy, killSwitchEnabled: true }, 100)).toBe(false);
    expect(canExecuteAutonomousAction(policy, 5001)).toBe(false);
  });

  it("blocks critical account publishing", () => {
    const base = { workspaceId: "w", accountId: "a", risk: "LOW" as const, killSwitchEnabled: false, allowedScopes: ["publish"], maxPostsPerDay: 3 };
    expect(canPublishForAccount(accountPolicySchema.parse(base))).toBe(true);
    expect(canPublishForAccount(accountPolicySchema.parse({ ...base, risk: "CRITICAL" }))).toBe(false);
  });

  it("prevents secret-bearing memory writes", () => {
    const base = { workspaceId: "w", scope: "BRAND" as const, subjectId: "b", evidenceIds: ["e1"], confidence: 0.9, content: "lesson", containsSecret: false };
    expect(canWriteMemory(memoryWriteSchema.parse(base))).toBe(true);
    expect(canWriteMemory(memoryWriteSchema.parse({ ...base, containsSecret: true }))).toBe(false);
  });

  it("requires approval and explicit scopes for extension installation", () => {
    const base = { workspaceId: "w", pluginId: "p", kind: "AGENT" as const, permissions: ["agents:register"], dataScopes: ["brand:read"], toolScopes: ["research"], approved: true };
    expect(canInstallExtension(extensionGrantSchema.parse(base))).toBe(true);
    expect(canInstallExtension(extensionGrantSchema.parse({ ...base, approved: false }))).toBe(false);
  });

  it("requires active entitled clients", () => {
    const base = { workspaceId: "w", clientId: "c", status: "ACTIVE" as const, entitlementIds: ["ugc"], killSwitchEnabled: false };
    expect(canOperateClient(clientPolicySchema.parse(base))).toBe(true);
    expect(canOperateClient(clientPolicySchema.parse({ ...base, status: "PAUSED" }))).toBe(false);
  });

  it("requires audited cross-module calls", () => {
    const base = { workspaceId: "w", module: "WORKFLOW" as const, capability: "ugc.execute", correlationId: "corr-1", audited: true };
    expect(canCrossModuleCall(moduleBridgeSchema.parse(base))).toBe(true);
    expect(canCrossModuleCall(moduleBridgeSchema.parse({ ...base, audited: false }))).toBe(false);
  });

  it("rejects duplicate workflow node ids", () => {
    expect(isWorkflowGraphStructurallySafe([{ id: "a", kind: "TRIGGER" }])).toBe(true);
    expect(isWorkflowGraphStructurallySafe([{ id: "a", kind: "TRIGGER" }, { id: "a", kind: "ACTION" }])).toBe(false);
  });

  it("validates all phase policy contracts", () => {
    expect(brandPolicySchema.parse({ lifecycle: "ACTIVE", workspaceId: "w", brandId: "b", killSwitchEnabled: false, allowedPlatforms: ["TIKTOK"], allowedProductCategories: ["TOOLS"] })).toBeTruthy();
    expect(accountPolicySchema.parse({ workspaceId: "w", accountId: "a", risk: "LOW", killSwitchEnabled: false, allowedScopes: ["publish"], maxPostsPerDay: 1 })).toBeTruthy();
    expect(clientPolicySchema.parse({ workspaceId: "w", clientId: "c", status: "ACTIVE", entitlementIds: ["ugc"], killSwitchEnabled: false })).toBeTruthy();
  });
});
