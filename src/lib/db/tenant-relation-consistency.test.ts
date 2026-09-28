import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { prisma } from "./client";

const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");

function parseTenantRelations() {
  const models = [...schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)].map(
    ([, name, body]) => ({
      name,
      body,
      tenant: /^\s*workspaceId\s+String(?:\s|$)/m.test(body),
    }),
  );
  const tenantModels = new Set(
    models.filter((model) => model.tenant).map((model) => model.name),
  );

  return models
    .filter((model) => model.tenant)
    .flatMap((model) => {
      return model.body.split("\n").flatMap((line) => {
        const relation = line.match(
          /^\s*\w+\s+(\w+)(?:\[\]|\?)?\s+@relation\((.*)\)$/,
        );
        if (!relation || !tenantModels.has(relation[1])) return [];

        const fields = relation[2].match(/fields:\s*\[([^\]]+)\]/)?.[1]
          ?.trim()
          .split(",")
          .map((field) => field.trim());
        const references = relation[2]
          .match(/references:\s*\[([^\]]+)\]/)?.[1]
          ?.trim()
          .split(",")
          .map((field) => field.trim());

        // Back-relation sides intentionally omit fields/references because the
        // foreign key is declared on the opposite side. Only FK-bearing
        // relation definitions can be checked by this SQL consistency test.
        if (!fields && !references) return [];
        if (!fields || !references || fields.length !== 1 || references.length !== 1) {
          throw new Error(
            `Unsupported tenant relation shape: ${model.name}->${relation[1]}`,
          );
        }

        return [
          {
            from: model.name,
            to: relation[1],
            field: fields[0],
            reference: references[0],
          },
        ];
      });
    });
}

describe("tenant relation integrity", () => {
  it("has no cross-workspace foreign-key references in existing data", async () => {
    const relations = parseTenantRelations();
    const violations: string[] = [];

    for (const relation of relations) {
      const table = (value: string) => `"${value.replace(/"/g, '""')}"`;
      const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(\`
        select count(*)::bigint as count
        from ${table(relation.from)} child
        join ${table(relation.to)} parent
          on child.${table(relation.field)} = parent.${table(relation.reference)}
        where child."workspaceId" is distinct from parent."workspaceId"
      \`);
      if ((result[0]?.count ?? 0n) > 0n) {
        violations.push(`${relation.from}.${relation.field}->${relation.to}.${relation.reference}`);
      }
    }

    expect(violations).toEqual([]);
  });
});
