# One-User UGC repository adoption report

## Scope

Compared against the canonical UGC Affiliate OS integration branch:

- `kaishinglo1982/one-user-ugc-affiliate-center`
- `kaishinglo1982/one-user-ugc-affiliate-center-main`

Excluded completely:

- `kaishinglo1982/ugc-affiliate-agency`, because its README identifies it as
  `who-knows-enterprise`;
- every nested path containing `who-knows` in the backup repository;
- Who Knows prompts, assets, storefronts, agents, routes, data and branding.

## Adopted now

1. Workspace-scoped provider circuit-breaker behavior, adapted to the canonical
   AI provider contract and tested for cross-workspace isolation.
2. Recursive provider-telemetry redaction, with fresh regular expressions per
   check to avoid stateful global-regex false negatives.
3. Release-evidence concepts added to the canonical merge-gate backlog:
   frozen install, migrations, backup/restore, security, accessibility,
   performance, approval-bypass, duplicate-publish, finance integrity and
   provider support matrices.

## Adopt later after canonical-domain review

- claim evidence and expiry checks;
- disclosure visibility, language, duration and platform-format validation;
- provider-cost and affiliate-payout reconciliation;
- immutable double-entry ledger reversals;
- signed backup/restore evidence;
- accessibility and performance release evidence.

These must be reimplemented against the canonical Prisma/RLS and Decimal
boundaries rather than copied from the single-user architecture.

## Rejected for direct transfer

- single-user identity and owner-only assumptions;
- Prisma 6 schema and migrations;
- Vite/React Router application shell;
- duplicate repositories, services and approval engines;
- Tauri desktop shell as a mandatory core dependency;
- mock/demo data;
- generated Tauri schemas and binary assets;
- embedded prompt-pack backup content;
- all Who Knows material.

## Repository relationship

`one-user-ugc-affiliate-center` is the newer working repository.
`one-user-ugc-affiliate-center-main` is an older one-commit backup containing
additional generated and embedded material. It is not an authoritative source.
