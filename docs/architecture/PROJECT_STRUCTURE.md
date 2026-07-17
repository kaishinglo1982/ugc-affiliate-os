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
- `src/lib/` — domain and platform modules.
- `src/styles/` — global styling primitives.
- `src/types/` — genuinely cross-cutting public types only; domain types remain in their domain.

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
