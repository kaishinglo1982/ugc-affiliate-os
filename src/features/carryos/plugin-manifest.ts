import { UGC_AFFILIATE_AUTOMATION_EXPORT } from "./automation-export";
import { UGC_AFFILIATE_COMPANY_OS } from "./company-os-contract";

export const UGC_AFFILIATE_CARRYOS_PLUGIN_MANIFEST = {
  manifestVersion: "2",
  id: "ugc-affiliate-os",
  name: "UGC Affiliate OS",
  version: "0.1.0",
  description: "Niche-independent UGC, content, affiliate commerce, social publishing and performance optimization plugin for CarryOS.",
  kind: "industry",
  publisher: {
    id: "carryos",
    name: "CarryOS",
  },
  compatibility: {
    carryos: ">=0.1.0",
    node: ">=22",
  },
  entrypoints: {
    runtime: "src/features/carryos/plugin-manifest.ts",
  },
  permissions: [
    "agents:register",
    "events:publish",
    "events:subscribe",
    "http:outbound",
    "storage:read",
    "storage:write",
    "tenant:read",
  ],
  capabilities: UGC_AFFILIATE_COMPANY_OS.capabilities.map((capability) => capability.key),
  lifecycle: "published",
  companyOS: UGC_AFFILIATE_COMPANY_OS,
  automation: UGC_AFFILIATE_AUTOMATION_EXPORT,
} as const;
