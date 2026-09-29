import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const schema = readFileSync(join(repoRoot, "prisma/schema.prisma"), "utf8");
const migrationsRoot = join(repoRoot, "prisma/migrations");

function parseModels(source: string) {
  return [...source.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)].map(
    ([, name, body]) => ({
      name,
      body,
      tenant: /^\s*workspaceId\s+String(?:\s|$)/m.test(body),
      nullableWorkspace: /^\s*workspaceId\s+String\?/m.test(body),
    }),
  );
}

function migrationSql() {
  return readdirSync(migrationsRoot)
    .sort()
    .map((entry) => {
      const path = join(migrationsRoot, entry, "migration.sql");
      try {
        return readFileSync(path, "utf8");
      } catch {
        return "";
      }
    })
    .join("\n");
}

describe("tenant schema/RLS coverage", () => {
  it("keeps workspaceId required on every tenant model", () => {
    const models = parseModels(schema);
    const tenantModels = models.filter((model) => model.tenant);
    const nullable = tenantModels.filter((model) => model.nullableWorkspace);

    expect(tenantModels).toHaveLength(123);
    expect(nullable.map((model) => model.name)).toEqual([]);
    expect(models.filter((model) => !model.tenant).map((model) => model.name).sort()).toEqual([
      "ContactRequest",
      "Session",
      "User",
    ]);
  });

  it("keeps exactly one workspace policy for every tenant model", () => {
    const models = parseModels(schema);
    const tenantModels = new Set(
      models.filter((model) => model.tenant).map((model) => model.name),
    );
    const policies = [
      ...migrationSql().matchAll(
        /CREATE POLICY "([^"]+)_workspace_isolation" ON "([^"]+)"/g,
      ),
    ].map((match) => match[2]);

    const uniquePolicies = new Set(policies);
    const missing = [...tenantModels].filter((model) => !uniquePolicies.has(model)).sort();
    const extra = [...uniquePolicies].filter((model) => !tenantModels.has(model)).sort();

    expect(policies).toHaveLength(123);
    expect(uniquePolicies.size).toBe(123);
    expect(missing).toEqual([]);
    expect(extra).toEqual([]);
  });

  it("does not introduce tenant models that directly reference global auth tables", () => {
    const models = parseModels(schema);
    const globalModels = new Set(["User", "Session", "ContactRequest"]);
    const violations: string[] = [];

    for (const model of models.filter((item) => item.tenant)) {
      for (const line of model.body.split("\n")) {
        const relation = line.match(
          /^\s*\w+\s+(\w+)\??\s+@relation\([^)]*fields:\s*\[[^\]]+\],\s*references:\s*\[[^\]]+\]/,
        );
        if (relation && globalModels.has(relation[1])) {
          violations.push(`${model.name}->${relation[1]}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps RLS activation staged until application context coverage is complete", () => {
    const sql = migrationSql();
    const enabled = [
      ...sql.matchAll(/ALTER TABLE "([^"]+)" ENABLE ROW LEVEL SECURITY/g),
    ].map((match) => match[1]);
    const forced = [
      ...sql.matchAll(/ALTER TABLE "([^"]+)" FORCE ROW LEVEL SECURITY/g),
    ].map((match) => match[1]);

    expect([...new Set(enabled)].sort()).toEqual(["AnalyticsSyncJob", "Product"]);
    expect([...new Set(forced)]).toEqual([]);
  });
});
