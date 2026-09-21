# Phase 11–20 Bulk — concrete domain contracts

The repository already contains substantial domain persistence for Brand, SocialAccount, Agent, Automation, Analytics, Experiments, Finance and approvals. This batch adds a single typed policy boundary instead of duplicating those domains.

## Phase mapping

| Phase | Existing canonical model/service area | Added boundary |
|---|---|---|
| 11 | Brand | lifecycle + brand policy |
| 12 | SocialAccount / publishing | risk + scope + kill switch |
| 13 | Agent / AgentRun | autonomy + tool/spend guard |
| 14 | Agent memory / knowledge | evidence + confidence + secret guard |
| 15 | CarryOS plugin contract | explicit extension grant |
| 16 | Automation / workflow validation | typed node graph guard |
| 17 | workspace/client entitlement layer | active/entitled client guard |
| 18 | analytics/worker operations | failure-domain taxonomy |
| 19 | CarryOS runtime adapter | audited module bridge |
| 20 | automation + agent governance | decision-class autonomy guard |

## Non-claims

This branch is a bulk foundation batch, not a claim that phases 11–20 have passed their complete 10/10 Definition of Done. Provider OAuth, all feature-specific APIs/UI, durable persistence for every future entity, worker execution, E2E, migrations, load/DR and external-provider contract tests remain subject to the repository gates.

## Required follow-up gates

pnpm run typecheck, pnpm run lint, pnpm run test, pnpm run build, pnpm run validate:deploy, tenant isolation, security, integration/E2E, and migration checks must be verified before merge.

Deployment policy: no Vercel deployment.
