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
