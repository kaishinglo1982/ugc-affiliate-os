-- Scope tenant-owned unique identifiers by workspace.
DROP INDEX IF EXISTS "AffiliateLink_shortSlug_key";
CREATE UNIQUE INDEX "AffiliateLink_workspaceId_shortSlug_key"
  ON "AffiliateLink"("workspaceId", "shortSlug");

DROP INDEX IF EXISTS "Agent_key_key";
CREATE UNIQUE INDEX "Agent_workspaceId_key_key"
  ON "Agent"("workspaceId", "key");

DROP INDEX IF EXISTS "AgentToolDefinition_name_key";
CREATE UNIQUE INDEX "AgentToolDefinition_workspaceId_name_key"
  ON "AgentToolDefinition"("workspaceId", "name");

DROP INDEX IF EXISTS "AffiliateOffer_provider_externalProductId_externalOfferId_key";
CREATE UNIQUE INDEX "AffiliateOffer_workspaceId_provider_externalProductId_externalOfferId_key"
  ON "AffiliateOffer"("workspaceId", "provider", "externalProductId", "externalOfferId");
