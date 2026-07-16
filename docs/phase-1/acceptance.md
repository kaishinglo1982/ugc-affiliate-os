# Phase 1 — Foundation Acceptance Matrix

Tracking issue: #8

Phase 1 is complete only when every mandatory control below has an implementation reference and reproducible evidence. A checkbox without evidence is not completion.

## Evidence format

For every control record:

- implementation paths;
- test paths and exact command;
- relevant migration IDs;
- security assumptions and negative tests;
- CI run or commit SHA;
- residual risk and rollback procedure.

## Foundation controls

| ID | Control | Owner | Required evidence | Status |
|---|---|---|---|---|
| FND-01 | Next.js App Router and TypeScript strict | App Runtime | `tsconfig.json`, build and typecheck | In audit |
| FND-02 | No productive `any` types | QA/Security | static scan plus reviewed exceptions | In audit |
| FND-03 | PostgreSQL/Prisma migration governance | Data Platform | schema, immutable migrations, deploy test | In audit |
| FND-04 | Workspace context and row-level isolation | Data Platform | positive and cross-workspace negative tests | In audit |
| FND-05 | Authentication and secure sessions | App Runtime | login/session tests, cookie controls, expiry | In audit |
| FND-06 | RBAC and permission registry | App Runtime | permission matrix and deny-path tests | In audit |
| FND-07 | AES-256-GCM credential vault | App Runtime | crypto tests, masking, rotation design | In audit |
| FND-08 | Audit log and correlation IDs | App Runtime | critical-write coverage and trace test | In audit |
| FND-09 | Worker authentication, retry and DLQ | App Runtime | worker auth tests and failure-path evidence | In audit |
| FND-10 | Feature flags and licensing foundation | App Runtime | registry, default-deny behavior, tests | In audit |
| FND-11 | Provider registry | App Runtime | typed capabilities and contract boundary | In audit |
| FND-12 | Local/S3 storage abstraction | Deploy/CI/Docs | adapter tests and production configuration | In audit |
| FND-13 | Central Zod validation and error envelopes | App Runtime | route inventory and invalid-input tests | In audit |
| FND-14 | Idempotency for critical writes | App Runtime | replay tests and persisted key behavior | In audit |
| FND-15 | Logs, traces and metrics foundation | Deploy/CI/Docs | correlation, redaction and health evidence | In audit |
| FND-16 | Secret protection | QA/Security | repository scan, log/prompt redaction tests | In audit |
| FND-17 | CI and deploy validation | Deploy/CI/Docs | migrations, typecheck, lint, tests, build, e2e | Partially evidenced |
| FND-18 | Auth/RBAC/Vault/Queue/Isolation E2E coverage | QA/Security | reproducible E2E commands and CI result | In audit |

## Mandatory commands

```bash
pnpm install --frozen-lockfile
pnpm run db:generate
pnpm run db:migrate:deploy
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
pnpm run validate:deploy
pnpm run test:e2e
```

## Merge gate

The coordinator may mark Phase 1 complete only when:

1. every FND control is `Passed`, `Passed with documented exception`, or explicitly deferred by the owner;
2. no P0/P1 security finding remains open;
3. cross-workspace access, missing permissions, malformed input, replayed writes and invalid worker secrets fail safely;
4. secrets are absent from responses, logs, events, prompts and committed files;
5. CI evidence is linked in the closing report;
6. rollback and migration notes are complete.

## Completion report template

```md
# Phase 1 Completion Report

Commit/PR:
CI run:
Migration range:

## Passed controls
- FND-...

## Exceptions
- Control:
- Reason:
- Risk:
- Owner:
- Due date:

## Validation
- typecheck:
- lint:
- unit/integration:
- build:
- validate:deploy:
- e2e:

## Security verification
- tenant/workspace isolation:
- RBAC deny paths:
- vault and masking:
- worker auth:
- secret scan:
- idempotency replay:

## Rollback

## Final decision
PASS / FAIL
```
