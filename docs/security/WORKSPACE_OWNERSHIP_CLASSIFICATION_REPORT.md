# Workspace ownership classification report

**Status:** SOURCE_SCHEMA_REVIEW_COMPLETE; LIVE_DATA_CLASSIFICATION_BLOCKED  
**Repository:** `kaishinglo1982/ugc-affiliate-os`  
**Branch:** `fix/rls-transaction-bound-workspace-context`  
**Scope:** Prisma schema and checked-in migration review only. This is not a live database report and contains no fabricated row counts.

## 1. Database target verification

The connected Neon project visible to this session is `carryos-production` (`flat-wind-11774748`). Its default branch is archived and its table inventory is CarryOS Core-oriented (`Tenant`, `CoreCustomer`, `CoreInvoice`, etc.), not the UGC Affiliate OS schema. It is not a safe or verified target for UGC ownership queries, backfills, or RLS changes. No SQL was run against it.

A database/project explicitly identified as the UGC Affiliate OS deployment is required to produce live row counts and classifications. Until then, the categories below are schema-derived only.

## 2. SQL-to-Prisma schema comparison

Confirmed against `prisma/schema.prisma`:

- `Campaign.productId` and `Campaign.affiliateLinkId` exist.
- `AffiliateLink.programId` and `AffiliateLink.productId` exist.
- `Revenue.campaignId`, `Revenue.programId`, and `Revenue.workspaceId` exist.
- `Expense.campaignId`, `Expense.productId`, and `Expense.workspaceId` exist.
- `AffiliateOffer.affiliateProgramId`, `AffiliateOffer.productId`, and `AffiliateOffer.workspaceId` exist. The SQL template's `AffiliateOffer."affiliateProgramId"` reference is correct.
- `TaxSetting` has no workspace field.
- `AffiliateProgram` has no workspace field and references `EncryptedCredential` through `credentialId`.
- `Campaign`, `AffiliateLink`, `LinkClick`, `Script`, `VideoJob`, `MediaAsset`, `SocialAccount`, `SocialPost`, `Integration`, `Agent`, `AgentRun`, `Automation`, `AutomationRun`, `Notification`, and `AuditLog` have no direct workspace field in the inspected schema. This is not proof that every model is tenant-owned; each requires explicit global-catalog versus tenant-runtime classification.

The current ownership audit SQL is structurally aligned for the campaign and affiliate-program candidate fields listed above. It remains a template: physical deployed schema, migration head, constraints, and row-level data have not been verified against the UGC database.

## 3. Schema-derived ownership classification

| Model/group | Schema evidence | Classification | Safe automatic backfill? |
|---|---|---|---|
| Product | Direct `workspaceId`; default is sentinel UUID | Tenant-owned, but sentinel rows have unknown real owner | No, not from sentinel alone |
| Revenue / Expense | Direct `workspaceId`; links to product/campaign/program | Tenant-owned candidate; cross-reference consistency must be checked | No, not from sentinel alone |
| AffiliateOffer / AffiliateOfferSnapshot | Direct `workspaceId`; offer links to Product and AffiliateProgram | Tenant-owned candidate; both parents must agree with workspace evidence | No, conflicts/orphans must be isolated |
| Campaign | Optional Product and AffiliateLink parents; Revenue/Expense children can provide evidence | Inferred ownership only | Only after exactly one validated candidate and reviewed source rows |
| AffiliateLink | AffiliateProgram parent and optional Product parent; no direct workspace field | Inferred ownership only; program and product evidence can conflict | Only after parent ownership is established |
| AffiliateProgram | Provider catalog fields mixed with tenant-like configuration (`trackingId`, `credentialId`, status, notes, customName) | Semantics unresolved; likely requires global provider definition separated from tenant connection/configuration | No |
| EncryptedCredential | No workspace field; may be referenced by AffiliateProgram, SocialAccount, Integration | Secret ownership unresolved and high risk | No |
| TaxSetting | No workspace field; singleton count and business semantics unknown | Owner and cardinality unresolved | No |
| SocialAccount / SocialPost | No direct workspace field; SocialPost links to SocialAccount and optional Campaign/MediaAsset | Tenant runtime state, but ownership chain is incomplete | No |
| Script / VideoJob / MediaAsset | No direct workspace field; optional links among Product/Campaign/VideoJob | Ownership must be derived and validated across all non-null parents | No |
| Integration | No workspace field, `providerKey` is globally unique, credential relation exists | Global definition versus tenant installation/state conflated | No |
| Agent / Automation / Notification / AuditLog and related runs | No direct workspace field in inspected model definitions | Need separate global definitions from tenant-specific runtime/activity records | No |

## 4. Required live-data classification buckets

The live report must calculate and record, by table and exact database migration head:

1. **Unique candidate, review required** — one distinct workspace candidate derived only from validated parents.
2. **Conflicting candidates** — parent/evidence rows imply two or more workspace IDs.
3. **Orphaned** — required parent missing, dangling relation, or parent row absent.
4. **No sufficient ownership evidence** — sentinel-only ownership, no usable parent, unknown owner, or globally shared configuration without a defined tenant model.
5. **Already consistent** — direct workspace value agrees with all independently validated parent ownership evidence.
6. **Schema mismatch** — deployed table/column/constraint differs from the Prisma schema or migration history expected by the report.

Every category must include row counts and stable record identifiers for manual resolution (without dumping credential ciphertext, tokens, or other secrets). Credentials should be reported by IDs and reference counts only.

## 5. Backfill and RLS gates

Do not run a backfill until:
- the correct UGC database and branch are explicitly identified;
- the live schema and `_prisma_migrations` head are captured;
- the classification SQL is executed read-only and counts reconcile;
- conflicts, orphans, sentinel rows, and secret ownership are reviewed;
- an additive migration is tested on a disposable database branch;
- Dashboard and Analytics queries and all write paths are tenant-scoped;
- PostgreSQL tests run as a non-owner, non-`BYPASSRLS` role and prove cross-workspace reads/writes are denied.

RLS activation must be a separate reviewed migration after all gates pass. Do not merge PR #76 or enable RLS on the basis of this source-only report.
