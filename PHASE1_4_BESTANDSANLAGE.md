# Phase 1–4 — Interne Bestandsanalyse (Inventory)

> Verpflichtende Vorab-Analyse gemäß Masterprompt §6, bevor Phase 1 umgesetzt wird.
> Stand: Repository `ugc-affiliate-os` (enthält bereits Phasen 5, 6, 7).

## 1. Stack
- **Package Manager:** pnpm `9.15.9` (Lockfile `pnpm-lock.yaml`). `package.json` scripts: `dev`, `build`, `start`, `lint` (`eslint .`), `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `db:generate/migrate/migrate:deploy/seed/studio/reset`.
  - Achtung: das `validate`-Script nutzt noch `npm run …` statt `pnpm` (inkonsistent zur Projektwirklichkeit → anpassen).
- **Framework:** Next.js (App Router), TypeScript strikt. `AGENTS.md` warnt: nicht-standard Next-Version, Docs unter `node_modules/next/dist/docs`.
- **DB/ORM:** PostgreSQL + Prisma (`@prisma/adapter-pg` PrismaPg), Client in `src/generated/prisma`. Migrationen in `prisma/migrations/*` (init, social_post_metrics, publish_queue, phase6_analytics, phase7_product_intelligence).
- **Auth:** JWT-Session (`jose`), `bcryptjs` für Passwörter, Cookie-basiert, `src/lib/auth/session.ts` + `src/lib/auth/current-user.ts` (`getCurrentUser`, cached). `Session`/`User`-Model vorhanden.
- **Design-System:** Radix-basiert in `src/components/ui/*` (button, card, badge, input, select, tabs, table, data-table, dialog, dropdown-menu, toast/sonner, etc.). Tailwind. `lucide-react` Icons.

## 2. Bereits vorhanden (deckt große Teile von Phase 1–4 ab)
- **Workspace-Isolation:** keine `Workspace`-Tabelle, sondern logischer Default `DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001"` (`src/lib/config/workspace.ts`); alle operativen Modelle tragen `workspaceId` + Indizes. Isolation wird in Services via `where:{workspaceId}` durchgesetzt.
- **RBAC:** `src/lib/auth/rbac.ts` — `Permission`-Union, `Role`, `ROLE_PERMISSIONS`, `hasPermission`, `requireApiPermission` (Guard, 63 Nutzungen). Rollen: owner/admin/analyst/affiliate_manager/content_manager/publisher/finance_viewer/viewer.
- **API-Konvention:** `requireApiPermission` + Zod-Validierung + `NextResponse.json` + `src/types/result.ts` (`ok/fail`, `newRequestId`). Mutationen schreiben via `writeAuditLog`.
- **Audit:** `AuditLog`-Model + `src/lib/audit/log.ts` (`writeAuditLog`, niemals werfend). Action-Labels in `format.ts`.
- **Feature-Flags:** `src/lib/config/feature-flags.ts` (env-gesteuert, serverseitig geprüft).
- **Observability:** `src/lib/observability/metrics.ts` — `METRICS`, `incrementMetric`, `logStructured` (redacted: Secrets/Tracking-URLs/PII).
- **Credential-Encryption:** `EncryptedCredential`-Model + `src/lib/encryption/aes.ts` (AES-256-GCM, Key aus Env `ENCRYPTION_KEY`, `keyVersion`).
- **Affiliate Core (Phase 2):** `AffiliateProgram` (provider, customName, trackingId, credentialId, mode, status), `AffiliateOffer`, `AffiliateLink`, `Campaign`, `Product` (Phase-7-erweitert: canonicalName/slug/brandName/categoryId/nicheId/status/riskLevel), `ProductImportBatch`/`ProductImportRow` (CSV-Preview/Commit), `ProductComplianceProfile`.
- **Content/Medien (Phase 3):** `Script`/`ScriptVersion`, `ContentAsset` (Phase 6), `VideoJob`, `MediaAsset`; Provider/Registry unter `src/lib/providers/*` (Affiliate Mock + CSV). `ContentVariant`, `ContentIntelligenceProfile` vorhanden.
- **Agentic (Phase 4):** `Agent` + `AgentRun`, `Automation` + `AutomationRun` (Workflow-Engine-Äquivalent), `Approval` (Phase 7), `Niche`, `Brand`, `AudienceSegment`.
- **Dashboards:** `/app/dashboard`, `/app/products` (Radar), `/app/intelligence/*` (Phase 7: Discovery/Katalog/Detail/Opportunities/Matches/Import), `/app/agents`, `/app/automations`, `/app/analytics`, `/app/finance`, `/app/experiments`, `/app/recommendations`, `/app/content-intelligence`, `/app/optimization`, `/app/data-quality`, `/app/audit-log`, `/app/settings`.
- **Gates:** `pnpm typecheck` (0 Fehler), `pnpm lint` (0 Errors/68 Warnungen), `pnpm test` (129 passed), `pnpm build` (erfolgreich).

## 3. Echte Lücken gegenüber Masterprompt Phase 1–4
- **§7 Environment-Validierung:** keine zentrale, typisierte, beim Serverstart validierende Env-Validierung (nur direktes `process.env[name]` in Flags). → neu.
- **§18 Health Checks:** `GET /api/health` und `GET /api/health/database` fehlen. → neu.
- **§10/§50 API-Oberfläche:** Spezifizierte Routen fehlen größtenteils (`/api/workspace`, `/api/audit`, `/api/feature-flags`, `/api/affiliate/*`, `/api/campaigns`, `/api/content/*`, `/api/media/jobs`, `/api/agents` (außer bestehend), `/api/workflows`, `/api/approvals`, `/api/budgets`). Bestehende Routen nutzen andere Pfade (z. B. `/api/products`, `/api/experiments`).
- **§29–§32 Content Studio Modelle:** `ContentBrief` und `ContentHook` existieren **nicht** (vorhanden: `Script`/`ContentVariant`). `MediaGenerationJob` existiert nicht (vorhanden: `VideoJob`).
- **§37–§48 Agentic Stack:** `AgentToolDefinition`/`AgentToolPolicy`/`AgentToolCall`, `WorkflowDefinition`/`WorkflowStepDefinition`/`WorkflowRun`/`WorkflowStepRun`, `ApprovalRequest` (reicher als `Approval`), `BudgetPolicy`/`CostReservation`, `AgentMemoryEntry`, `ProviderConfiguration` fehlen weitgehend (vorhanden: `Automation`/`AutomationRun`, `Approval`, `ProductSourceConfiguration`/`Integration`).
- **§46 Approval:** bestehendes `Approval` deckt Resourcen-Typen/Status ab, aber nicht alle im Masterprompt geforderten `resourceType`/Kosten/Expiry-Felder exakt.
- **§24 Campaign:** `Campaign` nutzt `CampaignStatus` (DRAFT/RESEARCH/…) statt spec-`objective`/`budgetPolicyId`/exaktem `approvalStatus` (es gibt `ApprovalStatus`).

## 4. Technische Grenzen / Risiken
- Spec-Modelle weichen von bestehenden ab (ContentBrief vs Script, Workflow* vs Automation, MediaGenerationJob vs VideoJob, ApprovalRequest vs Approval). Klärung nötig: **Erweitern** bestehender Modelle vs. **Spiegeln** der Spec-Modelle (Gefahr paralleler Strukturen — verboten laut §3/Regelwerk).
- `validate`-Script nutzt `npm` statt `pnpm`.
- `lint` neigt unter Memory-Druck zum Timeout; `next build` läuft ESLint bereits erfolgreich.

## 5. Empfohlene Vorgehensweise
Phase 1 zuerst vervollständigen (Env-Validierung + Health Checks + vorhandene Foundation verifizieren), dann Phase 2–4 inkrementell, wobei fehlende Modelle **ergänzt** (nicht als Parallelstruktur dupliziert) und bestehende Konventionen (RBAC-Guard, Audit, Workspace-Isolation, Decimal, Result-Typ) strikt eingehalten werden.
