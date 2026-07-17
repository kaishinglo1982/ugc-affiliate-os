# Domain Ownership

## Purpose

Every module has one accountable owner profile and one mandatory reviewer profile. Ownership covers schema changes, public contracts, migrations, operational behavior, tests and documentation.

| Domain | Primary owner | Mandatory reviewer | Owns |
|---|---|---|---|
| `agents` | App Runtime | QA/Security | capability registry, routing, tools, policies, execution audit |
| `auth` | Security | App Runtime | sessions, identity, authentication and authorization boundaries |
| `db` | Data Platform | App Runtime | database client, transactions and persistence conventions |
| `security` | Security | Coordinator | encryption, secret handling, isolation and security controls |
| `workflows` | App Runtime | Data Platform | definitions, runs, state machines, claiming and orchestration |
| `affiliate` | Product Platform | Data Platform | programs, offers, links, attribution and provider semantics |
| `analytics` | Data Platform | Product Platform | normalized events, metrics, attribution and experiment evidence |
| `campaigns` | Product Platform | App Runtime | campaign lifecycle, planning and execution contracts |
| `content` | Product Platform | QA/Security | scripts, variants, claims, disclosures and content lifecycle |
| `finance` | Finance Platform | Data Platform | revenue, cost, tax estimates and financial reconciliation |
| `media` | Media Platform | Product Platform | assets, rendering, avatars, voice and production artifacts |
| `products` | Product Platform | Data Platform | product identity, research, matching, compliance and scoring |
| `publishing` | Publishing Platform | QA/Security | social accounts, scheduling, publication and platform effects |
| shared infrastructure | App Runtime | Coordinator | API envelopes, config, errors, events, queues, logging and storage |
| Prisma schema and migrations | Data Platform | Security | relational integrity, indexes, tenant scope and migration safety |
| CI and deployment | Deploy/CI | QA/Security | reproducible validation, release gates and rollback evidence |

## Ownership rules

- A change crossing two or more business domains requires the Coordinator profile.
- Schema changes require Data Platform review even when initiated by another owner.
- Authentication, authorization, credentials, approvals, payments, publishing and external side effects require QA/Security review.
- Cross-domain imports must use stable contracts or services owned by the target domain.
- No domain may silently redefine another domain's enum, identifier, status machine or persistence model.
- Shared infrastructure remains domain-neutral; business-specific branching belongs in the owning business domain.
- Temporary ownership gaps do not remove review requirements. The repository owner acts as fallback coordinator.

## Definition of done for structural changes

- ownership table remains accurate;
- architecture manifest updated;
- public contracts documented;
- dependency direction preserved;
- migrations are additive or have an explicit rollback plan;
- architecture check, typecheck, lint, unit tests, integration tests and build are green;
- phase and completion documentation identify the responsible owner and reviewer.
