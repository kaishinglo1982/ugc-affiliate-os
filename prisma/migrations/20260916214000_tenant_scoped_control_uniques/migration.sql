-- Integration and Agent identities are tenant-local runtime identities.
-- The historical global unique indexes prevent two workspaces from using the
-- same provider/agent key, even though RLS now isolates their rows.

DROP INDEX IF EXISTS "Integration_providerKey_key";
DROP INDEX IF EXISTS "Agent_key_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Integration_workspaceId_providerKey_key"
  ON "Integration"("workspaceId", "providerKey");

CREATE UNIQUE INDEX IF NOT EXISTS "Agent_workspaceId_key_key"
  ON "Agent"("workspaceId", "key");
