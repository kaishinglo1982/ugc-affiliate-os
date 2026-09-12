# Datenbank-Migrationsplan – UGC Affiliate OS Konsolidierung

**Datum:** 2026-08-18
**Branch:** `agent/consolidate-all-ugc-projects`
**Auftrag:** Phase 100 – Datenbankkonsolidierung (vor jeder Migration)

## 1. Vergleich der Prisma-Schemata (Ist-Stand)

| Aspekt | Ziel ugc-affiliate-os | center | agency |
|--------|----------------------|--------|--------|
| ORM | Prisma 7.8 (adapter-pg), `src/generated/prisma` | Prisma 6.12 | Drizzle 0.45 (nicht kompatibel) |
| Modelle | **126** | 37 | SQL-Tabellen (drizzle) |
| Tenant-Spalten | `workspaceId String @default("00000000-0000-0000-0000-000000000001")` auf fast allen Modellen | keine (Single-User ADR-0001) | `tenant_id NOT NULL` + RLS |
| Geld | Decimal `@db.Decimal` (Revenue/Expense/Product-Preise) | Decimal via decimal.js + Decimal-Spalten | (nicht vergleichbar) |
| Idempotenz | PublishJob-Policy, Analytics-Event-Dedup | AutomationIdempotencyKey + PublishJob.idempotencyKey @unique | – |
| Status-Enums | ProductStatus, Job-States, PublishStates … (versioniert in code) | ausführliche Statuskernel (VideoProject, PublishJob) | SQL-Constraints |
| Audit | `AuditLog`-Modell | Audit + Logs in security-Package | audit_events (immutable Trigger) |
| Migrationen | 10 (init → phase10_tool_execution_gateway) | 2 | 5 SQL-Dateien |

**Konsequenz:** Es entsteht **kein** gemeinsames Schema durch Kopie. Das Ziel-Schema ist die Basis; Konzepte aus C (Envelopes, Provenienz, Claims, Scheduler-Leases) und A (Tenant-Autorität) werden **als additive Modelle/Felder** eingebracht. Alle übernommenen C-Modelle erhalten `workspaceId`.

## 2. Migrationsregeln (verbindlich)

1. **Nur additive Migrationen** (CREATE TABLE / ADD COLUMN / ADD INDEX / ADD CONSTRAINT / neuer Enum-Wert). Kein Umbenennen, kein Löschen, kein Feld-Typwechsel bestehender Spalten in dieser Konsolidierung.
2. Keine Produktionsmigration; lokal auf `ugc_affiliate_os` (localhost:5432) getestet.
3. Keine Datenverluste: Migrationen fahren mit Default-/Bestandsdaten (z. B. Default-Tenant mit ID = DEFAULT_WORKSPACE_ID).
4. Jede neue mandantenfähige Entität: `workspaceId` + Index `@@index([workspaceId, …])`.
5. Fremdschlüssel nur mit `onDelete`-Semantik; Unique-Constraints für Idempotenz-Schlüssel.
6. Geld ausschließlich `Decimal` (`@db.Decimal(…, 2)`), nie Float.
7. Audit-Zeitstempel: `createdAt @default(now())`, `updatedAt @updatedAt` auf neuen Stammdaten.
8. Status-Enums als Prisma-Enums ergänzen (additiv erweiterbar).

## 3. Geplante Migrationen (Reihenfolge und Inhalt)

### M1 – Tenancy-Fundament (Phase 70)
- `enum TenantMode { SINGLE_OWNER MULTI_TENANT }`
- `model Tenant { id, name, slug?, mode, settings Json?, createdAt, updatedAt }`
- Index/Unique: `slug @unique`, `@@index([mode])`
- Seed: Default-Tenant `00000000-0000-0000-0000-000000000001` ("Single Owner", SINGLE_OWNER) – erstellt nur, wenn nicht vorhanden (idempotent)

### M2 – Governance-Gates (Phase 80.1)
- `model CostEnvelope { id, workspaceId, approvalId?, category, currency, minimum Decimal, maximum Decimal, freeAlternativeAvailable Boolean, consumedAt?, expiresAt?, createdAt, updatedAt }` + `@@index([workspaceId, status])`
- `Approval` additiv: `approvalTokenHash String?`, `consumedAt DateTime?` (Token-Verbrauch, Einmaligkeit)
- Idempotenz: `model ApprovalDecisionKey` bzw. Unique auf `Approval.resourceType/resourceId/actorId` – als eigener Index (idempotent entscheiden)

### M3 – Provider-Runtime/BYOK (Phase 80.2)
- `VideoProviderKey`-Enum erweitern: `PEXELS`, `HEYGEN`, `OMNIROUTE`, `INTERNAL_COMPOSER`, `CREATOR_MANUAL`, `TEST_DOUBLE` (additiv, bestehende Werte unverändert)
- `EncryptedCredential` additiv: `keyVersion`, `lastRotatedAt`, `lastUsedAt`, `healthStatus` (health-check-Feld)

### M4 – Kampagnen-Slice (Phase 80.4)
- `Campaign` additiv: `status2`→ nein, besser eigene Enums additiv: `campaignPhase CampaignPhase?`, `approvedBudget Decimal?`, `approvalId String?` (FK auf Approval)
- `model CampaignTenantMembership`? → nicht nötig; workspaceId übernimmt

### M5 – Compliance/Provenienz (Phase 80.7)
- `model ContentClaimCheck { id, workspaceId, contentType, contentId, ruleId, passed Boolean, severity, evidence Json, checkedAt, createdAt }`
- `MediaAsset` additiv: `provenanceSource String?`, `licenseStatus LicenseStatus?`, `licenseRef String?`, `commercialRightsConfirmed Boolean @default(false)`, `claimCheckId String?`
- `enum LicenseStatus { UNKNOWN PENDING VERIFIED REJECTED_COMMERCIAL }`

### M6 – Publishing-Human-Review (Phase 80.8)
- `SocialPost` additiv: `humanReviewedAt DateTime?`, `humanReviewerId String?` (Review-Gate)

### M7 – Analytics/Attribution-Verdrahtung (Phase 80.9)
- `model ConversionEvent { id, workspaceId, productId?, campaignId?, postId?, touchedAt, source, value Decimal, metadata Json?, createdAt }`
- `model TrackingTouch { id, workspaceId, conversionId?, touchType, sourceRef, touchedAt, sequence Int }` – Damit commerce-core-Contracts erfüllt (ADR Commerce-Core nennt fehlende Modelle)

### M8 – Finance-Ledger (Phase 80.10)
- `model LedgerEntry { id, workspaceId, entryType (REVENUE/COST/TRANSFER/TAX), currency, amount Decimal, bookingDate, sourceType, sourceId, note?, createdAt }` + Unique `@@unique([workspaceId, sourceType, sourceId])` (keine Doppelbuchung)

### M9 – Creator-Eskalation (Phase 80.11)
- `model CreatorEscalation { id, workspaceId, creatorRef, reason, status (OPEN/IN_REVIEW/APPROVED/REJECTED/DONE), requestedById, decidedById?, decisionNote?, createdAt, updatedAt }` – **keine Bezahlung**, nur manuelle Beauftragung

### M10 – Automation-Scheduler (Phase 80.12)
- `model AutomationLease { id, automationId, workerId, leaseExpiresAt, createdAt }` + Unique `@@unique([automationId])` (Lease-Semantik aus C)

Hinweis: Migrationen M2–M10 werden **jeweils zusammen mit ihrer Modul-Implementierung** erstellt (eine Migration pro Modul-Commit), nicht vorab. Dieser Plan fixiert nur Umfang, Reihenfolge und Regeln.

## 4. Teststrategie Migrationen

1. **Leere Datenbank:** `prisma migrate deploy` auf frischer DB `ugc_consolidation_test` (CREATE DATABASE via psql, nur lokal) → Status `up to date`, `prisma validate` grün.
2. **Bestandsdaten:** aktuelle lokale DB (`ugc_affiliate_os`, alle 10 Migrationen + Seed) → `prisma migrate dev --create-only` (SQL diff), Review, dann anwenden; vorhandene Zeilen unverändert (Sample-Count-Check vor/nach je Kernmodell).
3. **Rollback/Wiederherstellung:** jede Migration ist ein separates SQL-Skript; Rollback im Test = `DROP`-Skript der neuen Objekte auf Test-DB ODER `migrate reset` nur auf throwaway-Test-DB. Produktion: kein Rollback geplant (nur additive Felder).
4. **Idempotenz:** Migrationen werden doppelt ausgeführt (deploy-Deploy) → zweiter Lauf meldet "already applied"/kein Fehler.

## 5. Verbotene Aktionen

- Kein `db:migrate dev` in Produktionsdatenbank
- Kein `db:reset` auf lokale Entwicklungs-DB (enthält ggf. Echt-Dev-Daten) – nur auf explizit erstellte Test-DBs
- Kein Feld-Typwechsel / keine Spalten-Umbenennung
- Kein Commit von Umgebungs-/Secret-Daten in Test-DBs

## 6. Verifikation nach jeder Migration

- `pnpm run db:generate` (Client-Neuausgabe)
- `pnpm run db:status` → "up to date"
- `pnpm run typecheck` (neue Client-Typen)
- Modul-Tests des betroffenen Bereichs
- `git diff --check`