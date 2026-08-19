# Canonical Project Structure

## Objective

This repository uses a domain-oriented modular monolith. The structure must keep product domains, platform capabilities, user interface code, generated code and infrastructure concerns visibly separated while preserving a single deployable Next.js application.

## Root layout

- `.github/` — CI, ownership and repository automation.
- `docs/` — architecture decisions, phase evidence and operational documentation.
- `prisma/` — canonical relational schema and immutable migrations.
- `public/` — static public assets only.
- `scripts/` — repository-level validation and operational scripts.
- `src/` — all product source code.

Configuration files stay at repository root only when required by their toolchain.

## Source layout

- `src/app/` — Next.js routes, layouts, route handlers and composition. Business rules do not live here.
- `src/components/` — reusable presentation components. Components may call application-facing services but do not query PostgreSQL directly.
- `src/generated/` — generated clients and types. Hand-written business logic is forbidden.
- `src/hooks/` — reusable React hooks.
- `src/instrumentation.ts` — Next.js instrumentation hook. Framework-mandated exact path; cannot move.
- `src/lib/` — domain and platform modules.
- `src/styles/` — global styling primitives.
- `src/test/` — cross-cutting test-only infrastructure (e.g. module stubs referenced from `vitest.config.ts`), not a domain and not product code.
- `src/types/` — genuinely cross-cutting public types only; domain types remain in their domain.

`src/features/` and `src/server/` currently exist outside this model and are a known, tracked
architecture debt — see "Known deviations" below. They are not sanctioned additions to the
Source layout above.

## Domain model

`src/lib` is split conceptually into three groups.

### Platform domains

Platform domains provide reusable operating-system capabilities:

- `agents`
- `auth`
- `db`
- `security`
- `workflows`

### Business domains

Business domains own use cases and data semantics:

- `affiliate`
- `analytics`
- `campaigns`
- `content`
- `finance`
- `media`
- `products`
- `publishing`

### Shared infrastructure

Shared infrastructure must remain narrow and domain-neutral:

- `api`
- `config`
- `errors`
- `events`
- `idempotency`
- `logging`
- `queue`
- `storage`
- `validation`

The manifest in `architecture.config.mjs` is authoritative. New domains require an architecture review and an update to that manifest.

## Dependency direction

1. UI and route composition may depend on business domains and platform domains.
2. Business domains may depend on platform domains and narrow shared infrastructure.
3. Platform domains may depend on shared infrastructure.
4. Shared infrastructure must not depend on a business domain.
5. Generated code must never import hand-written application code.
6. Direct database access belongs in domain repositories or explicit persistence adapters, not UI components or route composition.
7. Cross-domain calls use exported services and contracts, not another domain's internal test fixtures or private implementation files.

## File conventions

- Production source uses TypeScript only.
- Tests are colocated with the capability they verify or placed in a domain-local `__tests__` directory.
- Files use descriptive capability names; ambiguous containers such as `misc`, `helpers`, `temp` and `utils2` are forbidden.
- Applied Prisma migrations are immutable.
- A domain may expose an `index.ts` public surface, but internal files must not import through that barrel when it creates cycles.
- Repository paths must remain shallow enough to understand without tooling.

## Known deviations

`pnpm run architecture:check` intentionally still fails on two pre-existing, unregistered
top-level areas — this is a deliberate gap, not an oversight:

- `src/features/` (9 domain subdirectories, 44 files, imported from 65 other files as
  `@/features/*`)
- `src/server/` (`actions/` + `services/`, 38 files, imported from 84 other files as
  `@/server/*`)

Both predate this architecture manifest and overlap conceptually with `src/lib`'s business/
platform domain model. Folding them in would mean moving on the order of 80 files and updating
~150 import sites — exactly the kind of structural change this document's own "Change
protocol" requires a dedicated, reviewed migration for (explicit migration and rollback plan,
not a drive-by rename alongside an unrelated fix). Registering them as allowed source areas
without that review would silently normalize the duplication instead of resolving it, which is
worse than leaving the check red. Until that migration is scoped and approved, these two
failures are expected and should not be "fixed" by loosening `allowedSourceAreas` for them.

## Enforcement

Run:

```bash
pnpm run architecture:check
```

The same check is part of `pnpm run validate` and GitHub Actions. It validates the root contract, registered source areas, forbidden ambiguous directories, TypeScript-only production source and bounded nesting depth.

## Change protocol

A structural change is mergeable only when:

1. `architecture.config.mjs` reflects the intended structure;
2. this document remains accurate;
3. domain ownership is updated;
4. architecture checks, typecheck, lint, tests and build pass;
5. the pull request explains migration and rollback impact.
