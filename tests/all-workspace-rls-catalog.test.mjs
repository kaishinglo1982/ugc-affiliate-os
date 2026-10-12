import assert from "node:assert/strict";
import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for workspace RLS catalog verification");

const expectedTables = [
  "Product",
  "ProductScore",
  "AffiliateProgram",
  "AffiliateLink",
  "LinkClick",
  "Campaign",
  "Script",
  "ScriptVersion",
  "VideoJob",
  "MediaAsset",
  "SocialAccount",
  "SocialPost",
  "PublishJob",
  "Revenue",
  "Expense",
  "TaxSetting",
  "Integration",
  "EncryptedCredential",
  "Agent",
  "AgentRun",
  "Automation",
  "AutomationRun",
  "Notification",
  "ContactRequest",
  "AuditLog",
  "Approval",
  "Brand",
  "Niche",
  "ContentAsset",
  "AnalyticsEvent",
  "PlatformMetricSnapshot",
  "AnalyticsSyncJob",
  "AnalyticsProviderMapping",
  "ContentIntelligenceProfile",
  "ContentVariant",
  "ContentPerformanceSnapshot",
  "ProductPerformanceSnapshot",
  "PostingTimePerformance",
  "ContentExperiment",
  "ExperimentVariant",
  "ExperimentAssignment",
  "ExperimentResult",
  "OptimizationRecommendation",
  "OptimizationPolicy",
  "AudienceSegment",
  "DataQualityReport",
  "DataQualityIssue",
  "AnalyticsAnomaly",
  "OptimizationRule",
  "OptimizationRuleExecution",
  "ProductCategory",
  "AffiliateOffer",
  "AffiliateOfferSnapshot",
  "ProductDiscoveryQuery",
  "ProductDiscoveryQueryVersion",
  "ProductDiscoveryRun",
  "ProductDiscoveryProviderRun",
  "ProductImportBatch",
  "ProductImportRow",
  "ProductMatchCandidate",
  "ProductComplianceProfile",
  "ProductContentFitProfile",
  "ProductProfitabilityEstimate",
  "ProductOpportunity",
  "ProductOpportunityScoreComponent",
  "ProductDataQualityReport",
  "ProductDataQualityIssue",
  "ProductResearchJob",
  "ProductSourceConfiguration",
  "ContentBrief",
  "ContentHook",
  "WorkflowDefinition",
  "WorkflowStepDefinition",
  "WorkflowRun",
  "WorkflowStepRun",
  "AgentToolDefinition",
  "AgentToolPolicy",
  "AgentToolCall",
  "BudgetPolicy",
  "CostReservation",
  "AgentMemoryEntry",
  "CampaignCandidate",
  "CampaignStrategy",
  "CampaignAudienceProfile",
  "CreativeAngle",
  "CampaignHookPlan",
  "CampaignScriptPlan",
  "CampaignCallToActionPlan",
  "ContentBatch",
  "ContentBatchItem",
  "ProductionTask",
  "ProductionScheduleEntry",
  "CampaignFactoryTemplate",
  "CampaignFactoryRun",
  "CampaignQualityPolicy",
  "CampaignQualityReport",
  "CampaignQualityIssue",
  "ProductionCapacityProfile",
  "CampaignProductionEstimate",
  "MediaProviderConfiguration",
  "MediaModelDefinition",
  "MediaProductionProject",
  "MediaProductionPlan",
  "MediaScene",
  "MediaPromptTemplate",
  "VoiceProfile",
  "AvatarProfile",
  "MediaConsentRecord",
  "MediaGenerationJob",
  "MediaGenerationAttempt",
  "MediaAssetMetadata",
  "RenderSpecification",
  "MediaTimeline",
  "MediaTimelineTrack",
  "MediaTimelineClip",
  "RenderJob",
  "SubtitleTrack",
  "SubtitleCue",
  "MediaVariant",
  "MediaQualityPolicy",
  "MediaQualityReport",
  "MediaQualityIssue",
  "MediaRoutingDecision",
  "MediaLicenseReference"
];
const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  const result = await client.query(
    `SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled,
            c.relforcerowsecurity AS rls_forced,
            COUNT(p.oid)::int AS policy_count,
            BOOL_OR(p.polname = 'ugc_workspace_isolation_200_customer') AS has_workspace_policy
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       LEFT JOIN pg_policy p ON p.polrelid = c.oid
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = ANY($1::text[])
      GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity`,
    [expectedTables],
  );
  const byName = new Map(result.rows.map((row) => [row.table_name, row]));
  const missing = expectedTables.filter((name) => !byName.has(name));
  const insecure = expectedTables.filter((name) => {
    const row = byName.get(name);
    return !row || row.rls_enabled !== true || row.rls_forced !== true || row.has_workspace_policy !== true;
  });
  assert.deepEqual(missing, [], `Prisma workspace tables missing from PostgreSQL: ${missing.join(", ")}`);
  assert.deepEqual(insecure, [], `Workspace tables without enabled+forced RLS and explicit policy: ${insecure.join(", ")}`);
  console.log(`Workspace RLS catalog verification: PASS (${expectedTables.length} tables)`);
} finally {
  await client.end();
}
