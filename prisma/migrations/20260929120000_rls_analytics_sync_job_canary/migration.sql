-- RLS canary activation for AnalyticsSyncJob.
-- Product remains the first canary; this second table is activated only after
-- its application paths use transaction-bound workspace context.
ALTER TABLE "AnalyticsSyncJob" ENABLE ROW LEVEL SECURITY;
