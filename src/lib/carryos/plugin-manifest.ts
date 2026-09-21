import manifest from "../../../../carryos/plugin-manifest.json";
import { z } from "zod";

const permissionSchema = z.enum([
  "agents:register",
  "events:publish",
  "events:subscribe",
  "http:outbound",
  "storage:read",
  "storage:write",
  "ui:extend",
  "tenant:read",
]);

const eventFieldTypeSchema = z.enum(["string", "number", "boolean", "object", "array", "null"]);

const companyOSContractSchema = z.object({
  departments: z.array(z.object({
    key: z.string().min(1),
    name: z.string().min(1),
    purpose: z.string().min(1),
    parentKey: z.string().min(1).optional(),
  }).strict()),
  capabilities: z.array(z.object({
    key: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    departmentKey: z.string().min(1),
    requiredSkillKeys: z.array(z.string().min(1)).optional(),
    requiredConnectorKeys: z.array(z.string().min(1)).optional(),
    requiredPluginIds: z.array(z.string().min(1)).optional(),
    outcomeKeys: z.array(z.string().min(1)).optional(),
  }).strict()),
  skills: z.array(z.object({
    key: z.string().min(1),
    version: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    kind: z.enum(["SKILL", "SOP"]),
    departmentKey: z.string().min(1),
    capabilityKeys: z.array(z.string().min(1)),
    steps: z.array(z.string().min(1)).optional(),
    approvalRequired: z.boolean().optional(),
  }).strict()),
  businessObjects: z.array(z.object({
    type: z.string().min(1),
    displayName: z.string().min(1),
    owner: z.enum(["PLUGIN", "CORE_REFERENCE"]),
    idField: z.string().min(1),
    tenantField: z.string().min(1).optional(),
    dataClass: z.enum(["PUBLIC", "INTERNAL", "CONFIDENTIAL", "PII"]),
    eventTypes: z.array(z.string().min(1)).optional(),
  }).strict()),
  outcomes: z.array(z.object({
    key: z.string().min(1),
    name: z.string().min(1),
    unit: z.string().min(1),
    direction: z.enum(["HIGHER_IS_BETTER", "LOWER_IS_BETTER", "TARGET_RANGE"]),
    source: z.enum(["AGENT_RUN", "WORKFLOW_RUN", "BUSINESS_OBJECT", "EXTERNAL_SYSTEM"]),
    baselineRequired: z.boolean(),
  }).strict()),
  workforceTemplates: z.array(z.object({
    key: z.string().min(1),
    version: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    departmentKeys: z.array(z.string().min(1)),
    capabilityKeys: z.array(z.string().min(1)),
    skillKeys: z.array(z.string().min(1)),
    agentKeys: z.array(z.string().min(1)),
    workflowKeys: z.array(z.string().min(1)),
    requiredPluginIds: z.array(z.string().min(1)).optional(),
    requiredConnectorKeys: z.array(z.string().min(1)).optional(),
    outcomeKeys: z.array(z.string().min(1)).optional(),
    defaultAutonomy: z.enum(["L0", "L1", "L2", "L3", "L4", "L5"]).optional(),
  }).strict()),
}).strict();

const eventContractSchema = z.object({
  eventType: z.string().min(1),
  version: z.string().min(1),
  direction: z.enum(["publish", "subscribe"]),
  payload: z.object({
    fields: z.record(z.string(), eventFieldTypeSchema),
    required: z.array(z.string()).optional(),
    allowAdditionalProperties: z.boolean().optional(),
  }),
});

export const carryOsPluginManifestSchema = z.object({
  manifestVersion: z.literal("2"),
  id: z.literal("ugc-affiliate-os"),
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().min(1),
  kind: z.literal("industry"),
  publisher: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    website: z.string().url().optional(),
  }),
  compatibility: z.object({
    carryos: z.string().min(1),
    node: z.string().optional(),
  }),
  entrypoints: z.object({
    runtime: z.literal("/api/v1/plugins/ugc/execute"),
  }),
  permissions: z.array(permissionSchema),
  capabilities: z.array(z.string().min(1)),
  companyOS: companyOSContractSchema,
  eventContracts: z.array(eventContractSchema).optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
  lifecycle: z.enum(["draft", "review", "published", "deprecated", "suspended"]).optional(),
  checksum: z.string().optional(),
}).strict();

export type UGCPluginManifest = z.infer<typeof carryOsPluginManifestSchema>;

export function getCarryOsPluginManifest(): UGCPluginManifest {
  return carryOsPluginManifestSchema.parse(manifest);
}

export const CARRYOS_PLUGIN_ID = "ugc-affiliate-os" as const;
export const CARRYOS_CONTRACT_VERSION = "2026-09-16.v1" as const;
export const CARRYOS_EXECUTION_SCOPE = "carryos:workflow:execute" as const;
export const CARRYOS_REQUIRED_CAPABILITY = "ugc:runtime:execute" as const;
