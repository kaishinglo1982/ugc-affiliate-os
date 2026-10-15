# Read-only workspace ownership audit queries

Status: review template only. These queries are not a migration and have not been run against any database.
Target branch: `fix/rls-transaction-bound-workspace-context`.

## Safety notes

- Do not run write statements based on this document.
- Confirm physical table/column names from the deployed database and Prisma migrations first.
- The current app resolver in `src/lib/auth/tenant.ts` returns `DEFAULT_WORKSPACE_ID` when the CarryOS tenant header is absent unless `CARRYOS_INTEGRATION_MODE=CORE_BOUND`. This fallback is a significant multi-tenant safety risk if the app is expected to serve multiple workspaces. Before multi-tenant rollout, confirm the intended single-user/local mode and make missing tenant context fail closed for any multi-tenant mode.
- The resolver validates signed tenant assertions but workspace binding and user/workspace authorization must be treated as separate checks. A valid tenant UUID alone is not proof that the current user is authorized for that workspace.
- These queries only classify records. They do not establish that any record is safe to backfill.

## 1. Existing workspace-bearing tables

Run counts first, after confirming physical names:

```sql
SELECT 'Product' AS table_name, "workspaceId", count(*) AS row_count
FROM "Product"
GROUP BY "workspaceId"
UNION ALL
SELECT 'Revenue', "workspaceId", count(*)
FROM "Revenue"
GROUP BY "workspaceId"
UNION ALL
SELECT 'Expense', "workspaceId", count(*)
FROM "Expense"
GROUP BY "workspaceId"
UNION ALL
SELECT 'AffiliateOffer', "workspaceId", count(*)
FROM "AffiliateOffer"
GROUP BY "workspaceId"
ORDER BY table_name, "workspaceId";
```

The sentinel UUID `00000000-0000-0000-0000-000000000001` must be reported separately. Do not assume all sentinel rows belong to one real customer/workspace.

## 2. Campaign ownership ambiguity

A campaign can point to a product and/or affiliate link, while Revenue and Expense also reference campaigns. The following classifies candidate workspace IDs from these relations. It deliberately reports distinct candidate counts rather than selecting an owner.

```sql
WITH candidates AS (
  SELECT c.id AS campaign_id, p."workspaceId" AS workspace_id, 'product' AS source
  FROM "Campaign" c
  JOIN "Product" p ON p.id = c."productId"
  WHERE c."productId" IS NOT NULL

  UNION ALL

  SELECT r."campaignId", r."workspaceId", 'revenue'
  FROM "Revenue" r
  WHERE r."campaignId" IS NOT NULL

  UNION ALL

  SELECT e."campaignId", e."workspaceId", 'expense'
  FROM "Expense" e
  WHERE e."campaignId" IS NOT NULL
),
rollup AS (
  SELECT campaign_id,
         count(DISTINCT workspace_id) AS candidate_workspace_count,
         array_agg(DISTINCT workspace_id) AS candidate_workspace_ids,
         array_agg(DISTINCT source) AS evidence_sources
  FROM candidates
  GROUP BY campaign_id
)
SELECT c.id AS campaign_id,
       coalesce(r.candidate_workspace_count, 0) AS candidate_workspace_count,
       r.candidate_workspace_ids,
       r.evidence_sources,
       CASE
         WHEN coalesce(r.candidate_workspace_count, 0) = 0 THEN 'UNRESOLVED_NO_EVIDENCE'
         WHEN r.candidate_workspace_count = 1 THEN 'SINGLE_CANDIDATE_REVIEW_REQUIRED'
         ELSE 'CONFLICTING_CANDIDATES'
       END AS classification
FROM "Campaign" c
LEFT JOIN rollup r ON r.campaign_id = c.id
ORDER BY classification, c.id;
```

A single candidate is not automatic approval: confirm the source row itself is correctly owned and inspect affiliate-link ownership. Conflicting or absent candidates require manual resolution/quarantine.

## 3. Affiliate program ownership ambiguity

```sql
WITH candidates AS (
  SELECT al."programId" AS program_id, p."workspaceId" AS workspace_id, 'linked_product' AS source
  FROM "AffiliateLink" al
  JOIN "Product" p ON p.id = al."productId"
  WHERE al."productId" IS NOT NULL

  UNION ALL

  SELECT r."programId", r."workspaceId", 'revenue' AS source
  FROM "Revenue" r
  WHERE r."programId" IS NOT NULL

  UNION ALL

  SELECT ao."affiliateProgramId", ao."workspaceId", 'offer' AS source
  FROM "AffiliateOffer" ao
),
rollup AS (
  SELECT program_id,
         count(DISTINCT workspace_id) AS candidate_workspace_count,
         array_agg(DISTINCT workspace_id) AS candidate_workspace_ids,
         array_agg(DISTINCT source) AS evidence_sources
  FROM candidates
  GROUP BY program_id
)
SELECT ap.id AS affiliate_program_id,
       ap.provider,
       ap."customName",
       ap."credentialId",
       coalesce(r.candidate_workspace_count, 0) AS candidate_workspace_count,
       r.candidate_workspace_ids,
       r.evidence_sources,
       CASE
         WHEN coalesce(r.candidate_workspace_count, 0) = 0 THEN 'UNRESOLVED_NO_EVIDENCE'
         WHEN r.candidate_workspace_count = 1 THEN 'SINGLE_CANDIDATE_REVIEW_REQUIRED'
         ELSE 'CONFLICTING_CANDIDATES'
       END AS classification
FROM "AffiliateProgram" ap
LEFT JOIN rollup r ON r.program_id = ap.id
ORDER BY classification, ap.id;
```

Do not backfill credentials from a program's inferred owner until every reference from affiliate programs, social accounts, and integrations has been checked. Shared credentials, if any, require an explicit product-level security model and cannot be silently copied or exposed across workspaces.

## 4. Singleton tax settings

```sql
SELECT count(*) AS tax_setting_rows FROM "TaxSetting";
```

Review the existing row's effective owner and whether settings are intended per user or per workspace. Do not duplicate settings across workspaces without an approved business rule.

## 5. Required report before a backfill migration

Capture these counts in a reviewed artifact:
- total rows per tenant-owned model;
- null/blank workspace IDs, if nullable;
- sentinel workspace rows;
- campaign and affiliate-program candidates by classification;
- child rows with missing parents;
- relations whose parent and child candidate workspace sets conflict;
- credentials referenced by records with different or unresolved candidate owners;
- total tax settings and approved target mapping;
- exact physical schema and migration head used for the report.

Only unambiguous, reviewed mappings may be backfilled. Preserve unresolved rows without assigning an arbitrary workspace. Do not add `NOT NULL`, foreign keys, uniqueness constraints, or RLS policies until the classification report and application write paths have been reviewed.
