export interface UgcAffiliateWorkflowStep {
  stepKey: string;
  name: string;
  agentKey: string | null;
  capabilityRefs: readonly string[];
  approvalRequired: boolean;
  externalSideEffect: boolean;
}

export interface UgcAffiliateWorkflowManifest {
  key: string;
  version: string;
  pluginId: "ugc-affiliate-os";
  processId: string;
  name: string;
  description: string;
  intents: readonly string[];
  capabilities: readonly string[];
  steps: readonly UgcAffiliateWorkflowStep[];
}

export const UGC_AFFILIATE_WORKFLOW_KEYS = {
  productOfferResearch: "ugc.workflow.product-offer-research",
  campaignToScript: "ugc.workflow.campaign-to-script",
  assetToPublishing: "ugc.workflow.asset-to-publishing",
  attributionAnalytics: "ugc.workflow.attribution-analytics",
  performanceOptimization: "ugc.workflow.performance-optimization",
  affiliateIntegrity: "ugc.workflow.affiliate-integrity",
  multiAccountOperations: "ugc.workflow.multi-account-operations",
} as const;

export const UGC_AFFILIATE_WORKFLOW_MANIFESTS: readonly UgcAffiliateWorkflowManifest[] = [
  {
    key: UGC_AFFILIATE_WORKFLOW_KEYS.productOfferResearch,
    version: "1.0.0",
    pluginId: "ugc-affiliate-os",
    processId: "ugc.product-offer-research",
    name: "Product and Offer Research",
    description: "Collects and verifies product, merchant, network and demand signals before an affiliate opportunity is used downstream.",
    intents: ["product_research", "offer_research", "affiliate_opportunity"],
    capabilities: ["ugc.research.product", "ugc.research.offer", "ugc.research.verify", "ugc.affiliate.policy-check"],
    steps: [
      { stepKey: "collect-signals", name: "Collect approved product and offer signals", agentKey: "ugc.product-researcher", capabilityRefs: ["ugc.research.product", "ugc.research.offer"], approvalRequired: false, externalSideEffect: false },
      { stepKey: "verify-opportunity", name: "Verify sources, terms and claims", agentKey: "ugc.opportunity-analyst", capabilityRefs: ["ugc.research.verify", "ugc.affiliate.policy-check"], approvalRequired: false, externalSideEffect: false },
    ],
  },
  {
    key: UGC_AFFILIATE_WORKFLOW_KEYS.campaignToScript,
    version: "1.0.0",
    pluginId: "ugc-affiliate-os",
    processId: "ugc.campaign-to-script",
    name: "Campaign to Briefing and Script",
    description: "Turns a verified opportunity into briefing and script variants with claim review before downstream production.",
    intents: ["campaign_briefing", "script_generation", "claim_review"],
    capabilities: ["ugc.content.briefing", "ugc.content.script", "ugc.content.claim-review"],
    steps: [
      { stepKey: "campaign-briefing", name: "Generate campaign briefing", agentKey: "ugc.content-planner", capabilityRefs: ["ugc.content.briefing"], approvalRequired: false, externalSideEffect: false },
      { stepKey: "script-generation", name: "Generate script variants", agentKey: "ugc.script-writer", capabilityRefs: ["ugc.content.script"], approvalRequired: false, externalSideEffect: false },
      { stepKey: "claim-review", name: "Review brand, merchant and legal claims", agentKey: "ugc.compliance-reviewer", capabilityRefs: ["ugc.content.claim-review"], approvalRequired: true, externalSideEffect: false },
    ],
  },
  {
    key: UGC_AFFILIATE_WORKFLOW_KEYS.assetToPublishing,
    version: "1.0.0",
    pluginId: "ugc-affiliate-os",
    processId: "ugc.asset-to-publishing",
    name: "Asset Review and Publishing",
    description: "Validates and repurposes approved assets before approval-gated publishing to an external social channel.",
    intents: ["asset_review", "repurpose", "publishing"],
    capabilities: ["ugc.asset.validate", "ugc.asset.repurpose", "ugc.social.publish"],
    steps: [
      { stepKey: "asset-check", name: "Validate asset and metadata", agentKey: "ugc.asset-reviewer", capabilityRefs: ["ugc.asset.validate"], approvalRequired: false, externalSideEffect: false },
      { stepKey: "repurpose", name: "Repurpose for channel requirements", agentKey: "ugc.repurpose-agent", capabilityRefs: ["ugc.asset.repurpose"], approvalRequired: false, externalSideEffect: false },
      { stepKey: "publish", name: "Publish approved content", agentKey: "ugc.publisher", capabilityRefs: ["ugc.social.publish"], approvalRequired: true, externalSideEffect: true },
    ],
  },
  {
    key: UGC_AFFILIATE_WORKFLOW_KEYS.attributionAnalytics,
    version: "1.0.0",
    pluginId: "ugc-affiliate-os",
    processId: "ugc.attribution-analytics",
    name: "Affiliate Attribution and Analytics",
    description: "Collects verified performance evidence and attributes clicks, conversions and commissions without synthetic KPI data.",
    intents: ["affiliate_attribution", "commission_analytics", "conversion_analytics"],
    capabilities: ["ugc.analytics.collect", "ugc.analytics.attribute"],
    steps: [
      { stepKey: "collect-performance", name: "Collect verified performance evidence", agentKey: "ugc.analytics-agent", capabilityRefs: ["ugc.analytics.collect"], approvalRequired: false, externalSideEffect: false },
      { stepKey: "attribute", name: "Attribute clicks, conversions and commissions", agentKey: "ugc.attribution-agent", capabilityRefs: ["ugc.analytics.attribute"], approvalRequired: false, externalSideEffect: false },
    ],
  },
  {
    key: UGC_AFFILIATE_WORKFLOW_KEYS.performanceOptimization,
    version: "1.0.0",
    pluginId: "ugc-affiliate-os",
    processId: "ugc.performance-optimization",
    name: "Performance Optimization",
    description: "Evaluates measured outcomes and recommends the next content or offer action from verified evidence.",
    intents: ["performance_optimization", "next_content", "next_offer"],
    capabilities: ["ugc.analytics.evaluate", "ugc.optimization.recommend"],
    steps: [
      { stepKey: "evaluate-outcomes", name: "Evaluate measured outcomes", agentKey: "ugc.performance-analyst", capabilityRefs: ["ugc.analytics.evaluate"], approvalRequired: false, externalSideEffect: false },
      { stepKey: "recommend-next-action", name: "Recommend next content or offer", agentKey: "ugc.optimization-agent", capabilityRefs: ["ugc.optimization.recommend"], approvalRequired: false, externalSideEffect: false },
    ],
  },
  {
    key: UGC_AFFILIATE_WORKFLOW_KEYS.affiliateIntegrity,
    version: "1.0.0",
    pluginId: "ugc-affiliate-os",
    processId: "ugc.affiliate-integrity",
    name: "Affiliate Link and Offer Integrity",
    description: "Checks links, offers, tracking and changed program terms, escalating legal or policy uncertainty for human review.",
    intents: ["affiliate_integrity", "broken_link", "tracking_gap", "expired_offer"],
    capabilities: ["ugc.affiliate.integrity", "ugc.affiliate.policy-check"],
    steps: [
      { stepKey: "integrity-check", name: "Check links, offers and tracking", agentKey: "ugc.affiliate-integrity-agent", capabilityRefs: ["ugc.affiliate.integrity"], approvalRequired: false, externalSideEffect: false },
      { stepKey: "terms-escalation", name: "Escalate changed program terms or legal uncertainty", agentKey: "ugc.compliance-reviewer", capabilityRefs: ["ugc.affiliate.policy-check"], approvalRequired: true, externalSideEffect: false },
    ],
  },
  {
    key: UGC_AFFILIATE_WORKFLOW_KEYS.multiAccountOperations,
    version: "1.0.0",
    pluginId: "ugc-affiliate-os",
    processId: "ugc.multi-account-operations",
    name: "Multi-Brand and Multi-Account Operations",
    description: "Resolves isolated tenant, brand and account context before executing versioned workflows in that context.",
    intents: ["multi_account_operations", "multi_brand_operations", "contextual_workflow"],
    capabilities: ["ugc.context.resolve", "ugc.workflow.execute"],
    steps: [
      { stepKey: "resolve-context", name: "Resolve tenant, brand and account context", agentKey: "ugc.operations-router", capabilityRefs: ["ugc.context.resolve"], approvalRequired: false, externalSideEffect: false },
      { stepKey: "execute-contextual-workflow", name: "Execute versioned workflow in isolated context", agentKey: "ugc.operations-router", capabilityRefs: ["ugc.workflow.execute"], approvalRequired: false, externalSideEffect: false },
    ],
  },
] as const;

export function validateUgcAffiliateWorkflowManifests(): void {
  const keys = new Set<string>();
  for (const workflow of UGC_AFFILIATE_WORKFLOW_MANIFESTS) {
    if (keys.has(workflow.key)) throw new Error(`DUPLICATE_WORKFLOW_KEY:${workflow.key}`);
    keys.add(workflow.key);
    if (workflow.steps.length === 0) throw new Error(`EMPTY_WORKFLOW:${workflow.key}`);
    for (const step of workflow.steps) {
      if (step.externalSideEffect && !step.approvalRequired) {
        throw new Error(`UNAPPROVED_WORKFLOW_SIDE_EFFECT:${workflow.key}:${step.stepKey}`);
      }
    }
  }
}
