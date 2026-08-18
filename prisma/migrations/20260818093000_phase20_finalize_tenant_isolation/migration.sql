-- Phase 20 finalization: derive tenant ownership, replace global keys, and
-- require every future write to provide workspaceId explicitly.
-- This migration intentionally preserves the canonical legacy workspace for
-- standalone historical records whose ownership cannot be inferred.

UPDATE "ProductScore" c SET "workspaceId" = p."workspaceId" FROM "Product" p WHERE c."productId" = p."id";
UPDATE "AffiliateLink" c SET "workspaceId" = p."workspaceId" FROM "AffiliateProgram" p WHERE c."programId" = p."id";
UPDATE "LinkClick" c SET "workspaceId" = p."workspaceId" FROM "AffiliateLink" p WHERE c."linkId" = p."id";
UPDATE "Campaign" c SET "workspaceId" = COALESCE(p."workspaceId", l."workspaceId", c."workspaceId") FROM "Campaign" source LEFT JOIN "Product" p ON source."productId" = p."id" LEFT JOIN "AffiliateLink" l ON source."affiliateLinkId" = l."id" WHERE c."id" = source."id";
UPDATE "Script" c SET "workspaceId" = COALESCE(p."workspaceId", campaign."workspaceId", c."workspaceId") FROM "Script" source LEFT JOIN "Product" p ON source."productId" = p."id" LEFT JOIN "Campaign" campaign ON source."campaignId" = campaign."id" WHERE c."id" = source."id";
UPDATE "ScriptVersion" c SET "workspaceId" = p."workspaceId" FROM "Script" p WHERE c."scriptId" = p."id";
UPDATE "VideoJob" c SET "workspaceId" = COALESCE(s."workspaceId", p."workspaceId", campaign."workspaceId", c."workspaceId") FROM "VideoJob" source LEFT JOIN "Script" s ON source."scriptId" = s."id" LEFT JOIN "Product" p ON source."productId" = p."id" LEFT JOIN "Campaign" campaign ON source."campaignId" = campaign."id" WHERE c."id" = source."id";
UPDATE "MediaAsset" c SET "workspaceId" = COALESCE(v."workspaceId", p."workspaceId", campaign."workspaceId", c."workspaceId") FROM "MediaAsset" source LEFT JOIN "VideoJob" v ON source."videoJobId" = v."id" LEFT JOIN "Product" p ON source."productId" = p."id" LEFT JOIN "Campaign" campaign ON source."campaignId" = campaign."id" WHERE c."id" = source."id";
UPDATE "SocialPost" c SET "workspaceId" = a."workspaceId" FROM "SocialAccount" a WHERE c."accountId" = a."id";
UPDATE "PublishJob" c SET "workspaceId" = p."workspaceId" FROM "SocialPost" p WHERE c."postId" = p."id";
UPDATE "Revenue" c SET "workspaceId" = COALESCE(campaign."workspaceId", p."workspaceId", program."workspaceId", c."workspaceId") FROM "Revenue" source LEFT JOIN "Campaign" campaign ON source."campaignId" = campaign."id" LEFT JOIN "Product" p ON source."productId" = p."id" LEFT JOIN "AffiliateProgram" program ON source."programId" = program."id" WHERE c."id" = source."id";
UPDATE "Expense" c SET "workspaceId" = COALESCE(campaign."workspaceId", p."workspaceId", c."workspaceId") FROM "Expense" source LEFT JOIN "Campaign" campaign ON source."campaignId" = campaign."id" LEFT JOIN "Product" p ON source."productId" = p."id" WHERE c."id" = source."id";
UPDATE "AgentRun" c SET "workspaceId" = p."workspaceId" FROM "Agent" p WHERE c."agentId" = p."id";
UPDATE "AutomationRun" c SET "workspaceId" = p."workspaceId" FROM "Automation" p WHERE c."automationId" = p."id";
UPDATE "ExperimentVariant" c SET "workspaceId" = p."workspaceId" FROM "ContentExperiment" p WHERE c."experimentId" = p."id";
UPDATE "ExperimentResult" c SET "workspaceId" = p."workspaceId" FROM "ContentExperiment" p WHERE c."experimentId" = p."id";
UPDATE "DataQualityIssue" c SET "workspaceId" = p."workspaceId" FROM "DataQualityReport" p WHERE c."reportId" = p."id";
UPDATE "EncryptedCredential" c SET "workspaceId" = COALESCE(i."workspaceId", ap."workspaceId", sa."workspaceId", c."workspaceId") FROM "EncryptedCredential" source LEFT JOIN "Integration" i ON i."credentialId" = source."id" LEFT JOIN "AffiliateProgram" ap ON ap."credentialId" = source."id" LEFT JOIN "SocialAccount" sa ON sa."credentialId" = source."id" WHERE c."id" = source."id";

DROP INDEX IF EXISTS "Integration_providerKey_key";
DROP INDEX IF EXISTS "Agent_key_key";
CREATE UNIQUE INDEX "Integration_workspaceId_providerKey_key" ON "Integration"("workspaceId", "providerKey");
CREATE UNIQUE INDEX "Agent_workspaceId_key_key" ON "Agent"("workspaceId", "key");

ALTER TABLE "ProductScore" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "AffiliateProgram" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "AffiliateLink" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "LinkClick" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "Campaign" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "Script" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "ScriptVersion" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "VideoJob" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "MediaAsset" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "SocialAccount" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "SocialPost" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "PublishJob" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "Revenue" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "Expense" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "TaxSetting" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "Integration" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "EncryptedCredential" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "Agent" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "AgentRun" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "Automation" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "AutomationRun" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "Notification" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "AuditLog" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "ExperimentVariant" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "ExperimentResult" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "DataQualityIssue" ALTER COLUMN "workspaceId" DROP DEFAULT;
