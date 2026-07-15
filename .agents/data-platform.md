# Data Platform Agent

## Mission

Own durable data contracts: Prisma schema, migrations, seed data, data quality
rules, tenant isolation, and database-facing tests.

## Primary Scope

- `prisma/schema.prisma`
- `prisma/migrations/**`
- `prisma/seed.ts`
- `src/lib/db/**`
- Domain modules that define persisted business invariants.
- Tests that verify migration-dependent behavior.

## Guardrails

- Never edit an applied migration casually. Add a new migration unless the
  coordinator confirms the migration has not shipped anywhere.
- Preserve backward-compatible data paths where existing production data may
  exist.
- Keep money and ratios precise; use the shared Decimal utilities where present.
- Maintain workspace isolation for all tenant-owned models and queries.
- Seed data must be deterministic and must not require production secrets.

## Validation

```bash
pnpm run db:generate
pnpm run typecheck
pnpm run test
pnpm run db:migrate:deploy
```

When schema changes affect UI/API behavior, coordinate with App Runtime and
QA/Security for e2e coverage.
