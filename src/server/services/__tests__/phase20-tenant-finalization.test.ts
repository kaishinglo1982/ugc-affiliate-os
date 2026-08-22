import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
const migration = readFileSync(
  join(
    root,
    "prisma/migrations/20260818093000_phase20_finalize_tenant_isolation/migration.sql",
  ),
  "utf8",
);

const finalizedModels = [
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
  "AuditLog",
  "ExperimentVariant",
  "ExperimentResult",
  "DataQualityIssue",
] as const;

describe("Phase 20 tenant finalization contract", () => {
  it("removes the canonical legacy default from the Prisma schema", () => {
    expect(schema).not.toContain(
      'workspaceId String @default("00000000-0000-0000-0000-000000000001")',
    );
  });

  it("uses tenant-scoped unique keys for agents and integrations", () => {
    expect(schema).toContain("@@unique([workspaceId, key])");
    expect(schema).toContain("@@unique([workspaceId, providerKey])");
    expect(schema).not.toMatch(/providerKey\s+String\s+@unique/);
    expect(schema).not.toMatch(/key\s+String\s+@unique/);
  });

  it.each(finalizedModels)(
    "drops the temporary database default for %s",
    (model) => {
      expect(migration).toContain(
        `ALTER TABLE "${model}" ALTER COLUMN "workspaceId" DROP DEFAULT;`,
      );
    },
  );

  it("backfills child ownership before dropping defaults", () => {
    const firstDrop = migration.indexOf('ALTER TABLE "ProductScore" ALTER COLUMN');
    expect(firstDrop).toBeGreaterThan(0);
    for (const table of [
      "ProductScore",
      "AffiliateLink",
      "LinkClick",
      "ScriptVersion",
      "PublishJob",
      "AgentRun",
      "AutomationRun",
      "ExperimentVariant",
      "ExperimentResult",
      "DataQualityIssue",
    ]) {
      const backfill = migration.indexOf(`UPDATE "${table}"`);
      expect(backfill).toBeGreaterThanOrEqual(0);
      expect(backfill).toBeLessThan(firstDrop);
    }
  });
});
