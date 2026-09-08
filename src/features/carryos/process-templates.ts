export type UgcAutomationRisk = "low" | "medium" | "high" | "critical";

export interface UgcProcessTemplateStep {
  stepId: string;
  name: string;
  capabilityRefs: string[];
  connectorRefs: string[];
  workflowRef?: string;
  agentRefs: string[];
  humanApprovalRequired: boolean;
  externalSideEffect: boolean;
  risk: UgcAutomationRisk;
}

export interface UgcProcessTemplate {
  processId: string;
  pluginId: "ugc-affiliate-os";
  name: string;
  description: string;
  departmentId: string;
  version: string;
  taskMatchers: string[];
  outcomeKeys: string[];
  steps: UgcProcessTemplateStep[];
}

export const UGC_AFFILIATE_PROCESS_TEMPLATES: readonly UgcProcessTemplate[] = [
  {
    processId: "ugc.product-offer-research",
    pluginId: "ugc-affiliate-os",
    name: "Product and Offer Research",
    description: "Turns verified product, merchant, network and demand signals into affiliate opportunities.",
    departmentId: "research",
    version: "1.0.0",
    taskMatchers: ["product research", "offer research", "affiliate opportunity", "merchant research"],
    outcomeKeys: ["research.cycle_time", "research.verified_opportunities"],
    steps: [
      {
        stepId: "collect-signals",
        name: "Collect approved product and offer signals",
        capabilityRefs: ["ugc.research.product", "ugc.research.offer"],
        connectorRefs: [],
        agentRefs: ["ugc.product-researcher"],
        humanApprovalRequired: false,
        externalSideEffect: false,
        risk: "low",
      },
      {
        stepId: "verify-opportunity",
        name: "Verify sources, terms and claims",
        capabilityRefs: ["ugc.research.verify", "ugc.affiliate.policy-check"],
        connectorRefs: [],
        agentRefs: ["ugc.opportunity-analyst"],
        humanApprovalRequired: false,
        externalSideEffect: false,
        risk: "medium",
      },
    ],
  },
  {
    processId: "ugc.campaign-to-script",
    pluginId: "ugc-affiliate-os",
    name: "Campaign to Briefing and Script",
    description: "Creates campaign, briefing, hook, CTA and script variants from verified opportunities.",
    departmentId: "content",
    version: "1.0.0",
    taskMatchers: ["campaign", "briefing", "script", "hook", "cta"],
    outcomeKeys: ["content.cycle_time", "content.approval_rate"],
    steps: [
      {
        stepId: "campaign-briefing",
        name: "Generate campaign briefing",
        capabilityRefs: ["ugc.content.briefing"],
        connectorRefs: [],
        agentRefs: ["ugc.content-planner"],
        humanApprovalRequired: false,
        externalSideEffect: false,
        risk: "low",
      },
      {
        stepId: "script-generation",
        name: "Generate script variants",
        capabilityRefs: ["ugc.content.script"],
        connectorRefs: [],
        agentRefs: ["ugc.script-writer"],
        humanApprovalRequired: false,
        externalSideEffect: false,
        risk: "low",
      },
      {
        stepId: "claim-review",
        name: "Review brand, merchant and legal claims",
        capabilityRefs: ["ugc.content.claim-review"],
        connectorRefs: [],
        agentRefs: ["ugc.compliance-reviewer"],
        humanApprovalRequired: true,
        externalSideEffect: false,
        risk: "high",
      },
    ],
  },
  {
    processId: "ugc.asset-to-publishing",
    pluginId: "ugc-affiliate-os",
    name: "Asset Review and Publishing",
    description: "Validates, repurposes and prepares approved content assets for channel publishing.",
    departmentId: "social-publishing",
    version: "1.0.0",
    taskMatchers: ["publish", "publishing", "repurpose", "asset review", "video review"],
    outcomeKeys: ["publishing.cycle_time", "publishing.failure_rate"],
    steps: [
      {
        stepId: "asset-check",
        name: "Validate asset and metadata",
        capabilityRefs: ["ugc.asset.validate"],
        connectorRefs: [],
        agentRefs: ["ugc.asset-reviewer"],
        humanApprovalRequired: false,
        externalSideEffect: false,
        risk: "low",
      },
      {
        stepId: "repurpose",
        name: "Repurpose for channel requirements",
        capabilityRefs: ["ugc.asset.repurpose"],
        connectorRefs: [],
        agentRefs: ["ugc.repurpose-agent"],
        humanApprovalRequired: false,
        externalSideEffect: false,
        risk: "low",
      },
      {
        stepId: "publish",
        name: "Publish approved content",
        capabilityRefs: ["ugc.social.publish"],
        connectorRefs: ["social-channel"],
        agentRefs: ["ugc.publisher"],
        humanApprovalRequired: true,
        externalSideEffect: true,
        risk: "high",
      },
    ],
  },
  {
    processId: "ugc.attribution-analytics",
    pluginId: "ugc-affiliate-os",
    name: "Affiliate Attribution and Analytics",
    description: "Aggregates real post, click, conversion, commission and payout evidence without invented KPIs.",
    departmentId: "analytics",
    version: "1.0.0",
    taskMatchers: ["attribution", "analytics", "commission", "payout", "conversion"],
    outcomeKeys: ["affiliate.attribution_coverage", "affiliate.verified_commission"],
    steps: [
      {
        stepId: "collect-performance",
        name: "Collect verified performance evidence",
        capabilityRefs: ["ugc.analytics.collect"],
        connectorRefs: ["affiliate-network"],
        agentRefs: ["ugc.analytics-agent"],
        humanApprovalRequired: false,
        externalSideEffect: false,
        risk: "medium",
      },
      {
        stepId: "attribute",
        name: "Attribute clicks, conversions and commissions",
        capabilityRefs: ["ugc.analytics.attribute"],
        connectorRefs: [],
        agentRefs: ["ugc.attribution-agent"],
        humanApprovalRequired: false,
        externalSideEffect: false,
        risk: "medium",
      },
    ],
  },
  {
    processId: "ugc.performance-optimization",
    pluginId: "ugc-affiliate-os",
    name: "Performance Optimization",
    description: "Turns measured performance into next-content and next-offer recommendations.",
    departmentId: "analytics",
    version: "1.0.0",
    taskMatchers: ["optimization", "next content", "next offer", "performance review"],
    outcomeKeys: ["content.performance_delta", "affiliate.performance_delta"],
    steps: [
      {
        stepId: "evaluate-outcomes",
        name: "Evaluate measured outcomes",
        capabilityRefs: ["ugc.analytics.evaluate"],
        connectorRefs: [],
        agentRefs: ["ugc.performance-analyst"],
        humanApprovalRequired: false,
        externalSideEffect: false,
        risk: "low",
      },
      {
        stepId: "recommend-next-action",
        name: "Recommend next content or offer",
        capabilityRefs: ["ugc.optimization.recommend"],
        connectorRefs: [],
        agentRefs: ["ugc.optimization-agent"],
        humanApprovalRequired: false,
        externalSideEffect: false,
        risk: "low",
      },
    ],
  },
  {
    processId: "ugc.affiliate-integrity",
    pluginId: "ugc-affiliate-os",
    name: "Affiliate Link and Offer Integrity",
    description: "Detects broken links, expired offers, changed terms, tracking gaps and claim mismatches.",
    departmentId: "affiliate-commerce",
    version: "1.0.0",
    taskMatchers: ["broken link", "offer integrity", "tracking gap", "expired offer", "affiliate link"],
    outcomeKeys: ["affiliate.link_health", "affiliate.tracking_coverage"],
    steps: [
      {
        stepId: "integrity-check",
        name: "Check links, offers and tracking",
        capabilityRefs: ["ugc.affiliate.integrity"],
        connectorRefs: ["affiliate-network"],
        agentRefs: ["ugc.affiliate-integrity-agent"],
        humanApprovalRequired: false,
        externalSideEffect: false,
        risk: "medium",
      },
      {
        stepId: "terms-escalation",
        name: "Escalate changed program terms or legal uncertainty",
        capabilityRefs: ["ugc.affiliate.policy-check"],
        connectorRefs: [],
        agentRefs: ["ugc.compliance-reviewer"],
        humanApprovalRequired: true,
        externalSideEffect: false,
        risk: "high",
      },
    ],
  },
  {
    processId: "ugc.multi-account-operations",
    pluginId: "ugc-affiliate-os",
    name: "Multi-Brand and Multi-Account Operations",
    description: "Reuses versioned workflows while keeping brand, account, credential and knowledge contexts isolated.",
    departmentId: "operations",
    version: "1.0.0",
    taskMatchers: ["multi account", "multi brand", "account operations", "brand operations"],
    outcomeKeys: ["operations.reuse_rate", "operations.context_isolation"],
    steps: [
      {
        stepId: "resolve-context",
        name: "Resolve tenant, brand and account context",
        capabilityRefs: ["ugc.context.resolve"],
        connectorRefs: [],
        agentRefs: ["ugc.operations-router"],
        humanApprovalRequired: false,
        externalSideEffect: false,
        risk: "medium",
      },
      {
        stepId: "execute-contextual-workflow",
        name: "Execute versioned workflow in isolated context",
        capabilityRefs: ["ugc.workflow.execute"],
        connectorRefs: [],
        agentRefs: ["ugc.operations-router"],
        humanApprovalRequired: false,
        externalSideEffect: false,
        risk: "medium",
      },
    ],
  },
] as const;

export function getUgcAffiliateProcessTemplate(processId: string): UgcProcessTemplate | undefined {
  return UGC_AFFILIATE_PROCESS_TEMPLATES.find((template) => template.processId === processId);
}

export function validateUgcAffiliateProcessTemplates(): void {
  const ids = new Set<string>();
  for (const template of UGC_AFFILIATE_PROCESS_TEMPLATES) {
    if (ids.has(template.processId)) throw new Error(`DUPLICATE_PROCESS_TEMPLATE:${template.processId}`);
    ids.add(template.processId);
    if (template.steps.length === 0) throw new Error(`EMPTY_PROCESS_TEMPLATE:${template.processId}`);
    for (const step of template.steps) {
      if ((step.risk === "high" || step.risk === "critical") && !step.humanApprovalRequired) {
        throw new Error(`UNSAFE_HIGH_RISK_AUTOMATION:${template.processId}:${step.stepId}`);
      }
      if (step.externalSideEffect && !step.humanApprovalRequired) {
        throw new Error(`UNAPPROVED_EXTERNAL_SIDE_EFFECT:${template.processId}:${step.stepId}`);
      }
    }
  }
}
