import { UGC_AFFILIATE_WORKFLOW_MANIFESTS } from "./workflow-manifests";

export interface UgcCompanyOsDepartment {
  key: string;
  name: string;
  purpose: string;
}

export interface UgcCompanyOsCapability {
  key: string;
  name: string;
  description: string;
  departmentKey: string;
}

function departmentForCapability(capability: string): string {
  if (capability.startsWith("ugc.research.")) return "ugc-research";
  if (capability.startsWith("ugc.content.")) return "ugc-content";
  if (capability.startsWith("ugc.asset.") || capability.startsWith("ugc.social.")) return "ugc-publishing";
  if (capability.startsWith("ugc.analytics.") || capability.startsWith("ugc.optimization.")) return "ugc-analytics";
  if (capability.startsWith("ugc.affiliate.")) return "ugc-affiliate-commerce";
  return "ugc-operations";
}

const capabilityKeys = [...new Set(UGC_AFFILIATE_WORKFLOW_MANIFESTS.flatMap((workflow) => workflow.capabilities))];
const agentKeys = [...new Set(UGC_AFFILIATE_WORKFLOW_MANIFESTS.flatMap((workflow) => workflow.steps.flatMap((step) => step.agentKey ? [step.agentKey] : [])))];

export const UGC_AFFILIATE_COMPANY_OS = {
  departments: [
    { key: "ugc-research", name: "Research", purpose: "Verifies products, offers, merchants and source evidence before downstream use." },
    { key: "ugc-content", name: "Content", purpose: "Creates grounded campaign briefings, scripts and claim reviews." },
    { key: "ugc-publishing", name: "UGC & Publishing", purpose: "Validates, repurposes and approval-gates assets before external publishing." },
    { key: "ugc-affiliate-commerce", name: "Affiliate Commerce", purpose: "Maintains affiliate link, offer, tracking and policy integrity." },
    { key: "ugc-analytics", name: "Analytics & Optimization", purpose: "Attributes verified outcomes and recommends evidence-based next actions." },
    { key: "ugc-operations", name: "Operations", purpose: "Resolves isolated tenant, brand and account context for workflow execution." },
  ] satisfies readonly UgcCompanyOsDepartment[],
  capabilities: capabilityKeys.map((key): UgcCompanyOsCapability => ({
    key,
    name: key,
    description: `UGC Affiliate OS capability ${key}.`,
    departmentKey: departmentForCapability(key),
  })),
  skills: [],
  businessObjects: [],
  outcomes: [],
  workforceTemplates: [
    {
      key: "ugc-affiliate-os.default-workforce",
      version: "1.0.0",
      name: "UGC Affiliate OS Default Workforce",
      description: "Canonical workforce required to execute the seven versioned UGC Affiliate OS workflows.",
      departmentKeys: ["ugc-research", "ugc-content", "ugc-publishing", "ugc-affiliate-commerce", "ugc-analytics", "ugc-operations"],
      capabilityKeys,
      skillKeys: [],
      agentKeys,
      workflowKeys: UGC_AFFILIATE_WORKFLOW_MANIFESTS.map((workflow) => workflow.key),
      requiredPluginIds: ["ugc-affiliate-os"],
      requiredConnectorKeys: ["social-channel"],
      outcomeKeys: [],
      defaultAutonomy: "L2" as const,
    },
  ],
} as const;
