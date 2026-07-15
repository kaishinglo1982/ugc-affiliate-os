/**
 * Central feature-flag access. Flags are read from the environment at runtime so
 * they can be toggled without a redeploy of business logic. Defaults follow the
 * Phase 5 / Phase 6 spec: live integrations, AI assistance, and autonomous
 * behaviours are OFF by default; mock-first paths and human-gated operations are
 * ON. Every gate that touches a live external system or an autonomous change
 * MUST be checked through `featureFlags` before acting.
 */
export const featureFlags = {
  // Phase 5 — social publishing
  socialPublishingEnabled: flagEnabled("SOCIAL_PUBLISHING_ENABLED", true),
  liveAdaptersEnabled: flagEnabled("SOCIAL_LIVE_ADAPTERS_ENABLED", false),
  socialAnalyticsEnabled: flagEnabled("SOCIAL_ANALYTICS_ENABLED", true),
  deletePostEnabled: flagEnabled("SOCIAL_DELETE_POST_ENABLED", false),

  // Phase 6 — analytics sync
  analyticsEnabled: flagEnabled("SOCIAL_ANALYTICS_ENABLED", true),
  analyticsLiveAdaptersEnabled: flagEnabled("SOCIAL_ANALYTICS_LIVE_ADAPTERS_ENABLED", false),
  analyticsBackfillEnabled: flagEnabled("SOCIAL_ANALYTICS_BACKFILL_ENABLED", false),
  analyticsManualImportEnabled: flagEnabled("SOCIAL_ANALYTICS_MANUAL_IMPORT_ENABLED", true),

  // Phase 6 — content intelligence
  contentIntelligenceEnabled: flagEnabled("CONTENT_INTELLIGENCE_ENABLED", true),
  contentIntelligenceAiEnabled: flagEnabled("CONTENT_INTELLIGENCE_AI_ENABLED", false),
  contentVariantAiGenerationEnabled: flagEnabled("CONTENT_VARIANT_AI_GENERATION_ENABLED", false),

  // Phase 7 — product intelligence
  productDiscoveryEnabled: flagEnabled("PRODUCT_DISCOVERY_ENABLED", true),
  productDiscoveryMockProviderEnabled: flagEnabled("PRODUCT_DISCOVERY_MOCK_PROVIDER_ENABLED", true),
  productDiscoveryCsvEnabled: flagEnabled("PRODUCT_DISCOVERY_CSV_ENABLED", true),
  productDiscoveryAmazonEnabled: flagEnabled("PRODUCT_DISCOVERY_AMAZON_ENABLED", false),
  productDiscoveryEbayEnabled: flagEnabled("PRODUCT_DISCOVERY_EBAY_ENABLED", false),
  productDiscoveryAwinEnabled: flagEnabled("PRODUCT_DISCOVERY_AWIN_ENABLED", false),
  productDiscoveryImpactEnabled: flagEnabled("PRODUCT_DISCOVERY_IMPACT_ENABLED", false),
  productDiscoveryCjEnabled: flagEnabled("PRODUCT_DISCOVERY_CJ_ENABLED", false),
  productDiscoveryRakutenEnabled: flagEnabled("PRODUCT_DISCOVERY_RAKUTEN_ENABLED", false),
  productDiscoveryShareasaleEnabled: flagEnabled("PRODUCT_DISCOVERY_SHAREASALE_ENABLED", false),
  productDiscoveryAdcellEnabled: flagEnabled("PRODUCT_DISCOVERY_ADCELL_ENABLED", false),
  productDiscoveryDigistore24Enabled: flagEnabled("PRODUCT_DISCOVERY_DIGISTORE24_ENABLED", false),
  productEnrichmentAiEnabled: flagEnabled("PRODUCT_ENRICHMENT_AI_ENABLED", false),
  productAutoApprovalEnabled: flagEnabled("PRODUCT_AUTO_APPROVAL_ENABLED", false),
  productAutoContentGenerationEnabled: flagEnabled("PRODUCT_AUTO_CONTENT_GENERATION_ENABLED", false),

  // Phase 8 — Campaign Factory
  campaignFactoryEnabled: flagEnabled("CAMPAIGN_FACTORY_ENABLED", true),
  campaignFactoryMockModeEnabled: flagEnabled("CAMPAIGN_FACTORY_MOCK_MODE_ENABLED", true),
  campaignStrategyEnabled: flagEnabled("CAMPAIGN_STRATEGY_ENABLED", true),
  creativeOperationsEnabled: flagEnabled("CREATIVE_OPERATIONS_ENABLED", true),
  contentBatchesEnabled: flagEnabled("CONTENT_BATCHES_ENABLED", true),
  productionTasksEnabled: flagEnabled("PRODUCTION_TASKS_ENABLED", true),
  campaignQualityEnabled: flagEnabled("CAMPAIGN_QUALITY_ENABLED", true),
  campaignCapacityPlanningEnabled: flagEnabled("CAMPAIGN_CAPACITY_PLANNING_ENABLED", true),
  campaignAiStrategyEnabled: flagEnabled("CAMPAIGN_AI_STRATEGY_ENABLED", false),
  campaignAiAudienceEnabled: flagEnabled("CAMPAIGN_AI_AUDIENCE_ENABLED", false),
  campaignAiCreativeEnabled: flagEnabled("CAMPAIGN_AI_CREATIVE_ENABLED", false),
  campaignAutoApprovalEnabled: flagEnabled("CAMPAIGN_AUTO_APPROVAL_ENABLED", false),
  campaignAutoProductionEnabled: flagEnabled("CAMPAIGN_AUTO_PRODUCTION_ENABLED", false),
  campaignAutoPublishEnabled: flagEnabled("CAMPAIGN_AUTO_PUBLISH_ENABLED", false),
} as const;

export type FeatureFlags = typeof featureFlags;

function flagEnabled(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return defaultValue;
  return raw === "true" || raw === "1";
}
