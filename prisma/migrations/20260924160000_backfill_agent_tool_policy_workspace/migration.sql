-- Backfill tool policies to the workspace of their owning tool.
UPDATE "AgentToolPolicy" AS p
SET "workspaceId" = t."workspaceId"
FROM "AgentToolDefinition" AS t
WHERE t."id" = p."toolId";
