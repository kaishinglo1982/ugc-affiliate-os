# Phase 1–4 — UI & Operations Runbook

Ergänzung zum `PHASE1_4_ABSCHLUSSBERICHT.md`. Beschreibt die operativen UIs, Endpunkte und die E2E-Suite für die Phasen 3–4.

## 1. Navigationsstruktur (Variant A)
- `src/lib/app-nav.ts` wurde restructured (Übersicht/Affiliate/Content Studio/Medienjobs/Agenten/Workflows/Operations/Publishing/Intelligenz/Produkt-Intelligenz/System). Hilfsfunktionen `findNavItem`, `ALL_NAV_ITEMS`.
- **Redirects:** `src/app/app/automations/page.tsx` → `/app/workflows`; `src/app/app/audit-log/page.tsx` → `/app/audit`.

## 2. Seiten & Services (Pro-Bereich)
| Bereich | Route | Server-Service | Client-View |
| --- | --- | --- | --- |
| Content Übersicht | `/app/content` | `content.ts` (`contentOverview`) | — (Server) |
| Briefs | `/app/content/briefs` | `content.ts` (`listContentBriefs`) | `content/briefs-view.tsx` |
| Hooks | `/app/content/hooks` | `content.ts` (`listContentHooks`) | `content/hooks-view.tsx` |
| Agents | `/app/agents` | `agents.ts` (`listAgents`) | `agents/agents-view.tsx` |
| Agent Detail | `/app/agents/[id]` | `agents.ts` (`getAgent`) | — (Server) |
| Tool Governance | `/app/agents/tools` | `agents.ts` (`listAgentTools`) | `agents/tools-view.tsx` |
| Workflows | `/app/workflows` | `workflows.ts` (`listWorkflows`) | `workflows/workflows-view.tsx` |
| Workflow Detail | `/app/workflows/[id]` | `workflows.ts` (`getWorkflow`) | `workflows/workflow-detail-view.tsx` |
| Workflow Runs | `/app/workflow-runs` | `workflows.ts` (`listWorkflowRuns`) | — (Server) |
| Agent Runs | `/app/agent-runs` | `agents.ts` (`listAgentRuns`) | — (Server) |
| Freigaben | `/app/approvals` | `approvals.ts` (`listApprovals`) | `approvals/approvals-view.tsx` |
| Budgets | `/app/budgets` | `budgets.ts` (`listBudgets`) | `budgets/budgets-view.tsx` |
| Agent Memory | `/app/agent-memory` | `agent-memory.ts` (`listAgentMemory`) | `agent-memory/agent-memory-view.tsx` |
| Audit | `/app/audit` | `audit.ts` (`listAudit`) | — (Server) |

## 3. REST-Endpunkte (Phase 3–4, neu/ergänzt)
- `GET/POST /api/agents`, `PATCH /api/agents/[id]`, `POST /api/agents/[id]/run`
- `GET/POST /api/agents/tools`, `PATCH /api/agents/tools/[id]`
- `GET/POST /api/workflows`, `GET /api/workflows/[id]`, `PATCH /api/workflows/[id]`, `POST /api/workflows/[id]/run`, `POST /api/workflows/[id]/steps`
- `POST /api/workflow-runs/[id]/cancel`, `POST /api/workflow-runs/[id]/retry`
- (Phase 1–4 Bestand): `/api/health`, `/api/health/database`, `/api/workspace`, `/api/audit`, `/api/feature-flags`, `/api/affiliate/*`, `/api/campaigns`, `/api/content/*`, `/api/budgets`, `/api/agent-memory`, `/api/approvals`, `/api/approvals/[id]/decide`

## 4. Sicherheit & Konventionen
- **RBAC:** Jede Mutation via `requireApiPermission(Permission.*)`; UI-Blöcke ersetzen keine Serverprüfung. Neue Permissions: `content_briefs.*`, `content_hooks.*`, `workflows.*`, `agent_tools.*`, `agents.*`, `budgets.*`, `agent_memory.*`, `approvals.*`.
- **Keine Secrets/Tracking-URLs** in UI oder Logs (Agent-Detail & Memory zeigen bewusst keine Credentials; Audit-Filter maskieren Secrets/Tokens).
- **Geld:** `Prisma.Decimal`; **JSON:** `Prisma.InputJsonValue`.

## 5. E2E-Suite (`pnpm test:e2e`)
- Config: `playwright.config.ts` (webServer `pnpm start`, baseURL env `E2E_BASE_URL`, Auth-State `e2e/.auth/user.json`).
- Auth: `e2e/global-setup.ts` — nutzt gesäten E2E-User via `E2E_EMAIL`/`E2E_PASSWORD`; ohne Credentials wird ein leerer Auth-State geschrieben (für bereits authentifizierte Umgebungen).
- Specs: `navigation`, `content`, `agents`, `workflows`, `approvals`, `budgets`, `memory`, `security`.
- **Voraussetzungen zur Ausführung:**
  ```bash
  pnpm exec prisma migrate deploy
  pnpm build
  pnpm exec playwright install --with-deps chromium
  E2E_EMAIL=e2e@example.com E2E_PASSWORD=… pnpm test:e2e
  ```
  In der Build-Umgebung war die Ausführung nicht möglich (kein Browser-/DB-Runtime); die Specs sind als Liefergegenstand hinterlegt.

## 6. Unit-Tests (Auszug)
- `src/lib/status-labels.test.ts` — Badge/Label-Mappings (Deutsche Labels, Fallback bei unbekannten Keys).
