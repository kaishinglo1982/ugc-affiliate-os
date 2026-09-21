import { z } from "zod";

export const phase11BrandLifecycle = [
  "IDEA","VALIDATION","SETUP","TESTING","ACTIVE","GROWING","MATURE","DECLINING","PAUSED","ARCHIVED","RETIRED",
] as const;
export type BrandLifecycle = (typeof phase11BrandLifecycle)[number];

export const phase12AccountRisk = ["LOW","MEDIUM","HIGH","CRITICAL"] as const;
export type AccountRisk = (typeof phase12AccountRisk)[number];

export const phase13Autonomy = ["L0","L1","L2","L3","L4"] as const;
export type AutonomyLevel = (typeof phase13Autonomy)[number];

export const phase14MemoryScope = [
  "SYSTEM","WORKSPACE","PORTFOLIO","BRAND","CLIENT","ACCOUNT","PRODUCT","CAMPAIGN","AGENT","WORKFLOW","USER",
] as const;
export type MemoryScope = (typeof phase14MemoryScope)[number];

export const phase15ExtensionKind = [
  "CONNECTOR","PROVIDER","AGENT","WORKFLOW","UI","TEMPLATE","EXPORTER","REPORT","RULESET","KNOWLEDGE_PACK",
] as const;
export type ExtensionKind = (typeof phase15ExtensionKind)[number];

export const phase16NodeKind = [
  "TRIGGER","ACTION","AGENT","CONDITION","APPROVAL","WAIT","LOOP","PARALLEL","SUB_WORKFLOW",
  "NOTIFICATION","MANUAL_TASK","COMPENSATION","PLUGIN",
] as const;
export type WorkflowNodeKind = (typeof phase16NodeKind)[number];

export const phase17ClientStatus = ["ONBOARDING","ACTIVE","PAUSED","OFFBOARDING","ARCHIVED"] as const;
export type ClientStatus = (typeof phase17ClientStatus)[number];

export const phase18FailureDomain = [
  "API","WORKFLOW","RESEARCH","ANALYTICS","FINANCE","PLUGIN","MEDIA","QUEUE","DATABASE","STORAGE","PROVIDER","REGION",
] as const;
export type FailureDomain = (typeof phase18FailureDomain)[number];

export const phase19ModuleArea = [
  "IDENTITY","TENANT","RBAC","VAULT","EVENTS","WORKFLOW","AGENTS","NOTIFICATIONS","AUDIT","LICENSING","BILLING","KNOWLEDGE",
] as const;
export type ModuleArea = (typeof phase19ModuleArea)[number];

export const phase20DecisionClass = [
  "RESEARCH","CONTENT","MEDIA","PUBLISHING","ANALYTICS","OPTIMIZATION","FINANCE","SCALING",
] as const;
export type DecisionClass = (typeof phase20DecisionClass)[number];

export const autonomyPolicySchema = z.object({
  level: z.enum(phase13Autonomy),
  decisionClass: z.enum(phase20DecisionClass),
  requiresApproval: z.boolean(),
  maxSpendMinor: z.number().int().nonnegative(),
  allowedTools: z.array(z.string()).max(100),
  allowedScopes: z.array(z.string()).max(100),
  killSwitchEnabled: z.boolean(),
});

export type AutonomyPolicy = z.infer<typeof autonomyPolicySchema>;

export const brandPolicySchema = z.object({
  lifecycle: z.enum(phase11BrandLifecycle),
  workspaceId: z.string().min(1),
  brandId: z.string().min(1),
  killSwitchEnabled: z.boolean(),
  allowedPlatforms: z.array(z.string()).max(50),
  allowedProductCategories: z.array(z.string()).max(100),
});

export type BrandPolicy = z.infer<typeof brandPolicySchema>;

export const accountPolicySchema = z.object({
  workspaceId: z.string().min(1),
  accountId: z.string().min(1),
  risk: z.enum(phase12AccountRisk),
  killSwitchEnabled: z.boolean(),
  allowedScopes: z.array(z.string()).max(100),
  maxPostsPerDay: z.number().int().nonnegative(),
});

export type AccountPolicy = z.infer<typeof accountPolicySchema>;

export const memoryWriteSchema = z.object({
  workspaceId: z.string().min(1),
  scope: z.enum(phase14MemoryScope),
  subjectId: z.string().min(1),
  evidenceIds: z.array(z.string()).max(100),
  confidence: z.number().min(0).max(1),
  content: z.string().min(1).max(10000),
  containsSecret: z.boolean(),
});

export type MemoryWrite = z.infer<typeof memoryWriteSchema>;

export const extensionGrantSchema = z.object({
  workspaceId: z.string().min(1),
  pluginId: z.string().min(1),
  kind: z.enum(phase15ExtensionKind),
  permissions: z.array(z.string()).max(100),
  dataScopes: z.array(z.string()).max(100),
  toolScopes: z.array(z.string()).max(100),
  approved: z.boolean(),
});

export type ExtensionGrant = z.infer<typeof extensionGrantSchema>;

export const clientPolicySchema = z.object({
  workspaceId: z.string().min(1),
  clientId: z.string().min(1),
  status: z.enum(phase17ClientStatus),
  entitlementIds: z.array(z.string()).max(100),
  killSwitchEnabled: z.boolean(),
});

export type ClientPolicy = z.infer<typeof clientPolicySchema>;

export const moduleBridgeSchema = z.object({
  workspaceId: z.string().min(1),
  module: z.enum(phase19ModuleArea),
  capability: z.string().min(1),
  correlationId: z.string().min(1),
  audited: z.boolean(),
});

export type ModuleBridgeRequest = z.infer<typeof moduleBridgeSchema>;

export function canExecuteAutonomousAction(policy: AutonomyPolicy, requestedSpendMinor: number): boolean {
  if (policy.killSwitchEnabled || policy.requiresApproval) return false;
  if (requestedSpendMinor < 0 || requestedSpendMinor > policy.maxSpendMinor) return false;
  return policy.allowedScopes.length > 0 && policy.allowedTools.length > 0;
}

export function canPublishForAccount(policy: AccountPolicy): boolean {
  return !policy.killSwitchEnabled && policy.risk !== "CRITICAL" && policy.maxPostsPerDay > 0;
}

export function canWriteMemory(input: MemoryWrite): boolean {
  return !input.containsSecret && input.evidenceIds.length > 0 && input.confidence > 0;
}

export function canInstallExtension(input: ExtensionGrant): boolean {
  return input.approved && input.permissions.length > 0 && input.dataScopes.length > 0;
}

export function canOperateClient(input: ClientPolicy): boolean {
  return !input.killSwitchEnabled && input.status === "ACTIVE" && input.entitlementIds.length > 0;
}

export function canCrossModuleCall(input: ModuleBridgeRequest): boolean {
  return input.audited && input.correlationId.length > 0;
}

export function isWorkflowGraphStructurallySafe(nodes: readonly { id: string; kind: WorkflowNodeKind }[]): boolean {
  if (nodes.length === 0) return false;
  const ids = new Set<string>();
  let triggers = 0;
  for (const node of nodes) {
    if (ids.has(node.id)) return false;
    ids.add(node.id);
    if (node.kind === "TRIGGER") triggers += 1;
    if (node.kind === "LOOP" && nodes.length === 1) return false;
  }
  return triggers === 1;
}
