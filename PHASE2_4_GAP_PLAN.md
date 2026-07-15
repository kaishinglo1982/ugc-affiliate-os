# Phase 2–4 — Gap-Analyse & Reconciliation-Plan

> Strategie laut Nutzer-Entscheid: **Bestehende Modelle erweitern, nur echte Lücken ergänzen** (keine Parallelstrukturen). Repository enthält Phasen 5–7 bereits; Phase 1 ist abgeschlossen (Env-Validierung, Health, Workspace/Audit/Flags-APIs, RBAC-Erweiterung).

## Phase 2 — Affiliate Core
| Spec | Status | Aktion |
| --- | --- | --- |
| AffiliateProgram (provider, customName, trackingId, credentialId, mode, status) | ✓ `AffiliateProgram` | vorhanden |
| AffiliateOffer (Preis, Provision, Verfügbarkeit, Snapshots) | ✓ `AffiliateOffer` + `AffiliateOfferSnapshot` | vorhanden |
| AffiliateLink (Deep-Link, UTM, shortSlug, Klicks) | ✓ `AffiliateLink` + `LinkClick` | vorhanden |
| Campaign (budget, currency, status, Zeitraum) | ✓ `Campaign` | vorhanden; `objective`/`approvalStatus`/`budgetPolicyId` ggf. später ergänzen |
| `GET /api/affiliate/programs` | ✗ → **neu** | erledigt (RBAC `affiliate_programs.read`) |
| `GET /api/affiliate/offers` | ✓ `/api/products/offers` | vorhanden |
| `GET /api/affiliate/links` | ✗ → **neu** | erledigt (RBAC `affiliate_links.read`) |
| `GET /api/campaigns` | ✗ → **neu** | erledigt (RBAC `campaigns.read`) |
| Verschlüsselte Credentials | ✓ `EncryptedCredential` + AES-256-GCM | vorhanden |

## Phase 3 — Content Production
| Spec | Status | Aktion |
| --- | --- | --- |
| Script / Varianten / Versioning | ✓ `Script` + `ScriptVersion` + `ContentVariant` | vorhanden |
| ContentAsset / MediaAsset / VideoJob | ✓ `ContentAsset`, `MediaAsset`, `VideoJob` | vorhanden; Spec-`MediaGenerationJob` als **Erweiterung** von `VideoJob` (kein Parallelmodell) |
| ContentBrief / ContentHook (Planungs-Schicht) | ✗ | **NEU** (`ContentBrief`, `ContentHook`) — Planung über Script hinaus |
| Provider-Registry (Affiliate Mock + CSV) | ✓ `src/lib/providers/*` | vorhanden |
| `GET /api/content/*` | teils | API-Oberfläche bei Bedarf ergänzen (Mapping zu bestehenden `Script`/`ContentVariant`-Services) |

## Phase 4 — Agentic Operations
| Spec | Status | Aktion |
| --- | --- | --- |
| Agent + AgentRun | ✓ `Agent` + `AgentRun` | vorhanden |
| Workflow-Engine | △ `Automation` + `AutomationRun` | Spec-`WorkflowDefinition/Step` + `WorkflowRun/StepRun` als **Erweiterung** hinzufügen (Automation bleibt Bestand) |
| Tool-Governance | ✗ | **NEU** (`AgentToolDefinition`, `AgentToolPolicy`, `AgentToolCall`) |
| Approval | △ `Approval` | Spec-`ApprovalRequest` Felder (Kosten/Expiry/resourceType) prüfen & ggf. erweitern |
| BudgetPolicy / CostReservation | ✗ | **NEU** (`BudgetPolicy`, `CostReservation`) — Kostengovernance für Agenten/Workflows |
| AgentMemoryEntry | ✗ | **NEU** (`AgentMemoryEntry`) — persistentes Agent-Gedächtnis |
| ProviderConfiguration | △ `ProductSourceConfiguration`/`Integration` | Mapping prüfen |

## Nächste Schritte (Reihenfolge)
1. **Modell-Ergänzungen (Migrationen):** ContentBrief, ContentHook, Workflow*, AgentTool*, BudgetPolicy, CostReservation, AgentMemoryEntry. Ohne Live-DB-Bestätigung zurückgestellt.
2. **API-Oberfläche:** fehlende POST/PUT/Mutationen für Affiliate-/Campaign-Oberfläche bestehenden Server-Actions angleichen; Content-/Agent-Endpoints ergänzen.
3. **Dashboards:** vorhandene (`/app/agents`, `/app/automations`, `/app/campaigns`) gegen Spec-Dashboards abgleichen.
4. **Abschlussbericht Phase 1–4** (§65) schreiben.

## Risiken
- Schema-Änderungen erfordern `prisma migrate dev` gegen Live-DB — vorher mit Nutzer abstimmen.
- `lint` zeigt 68 Warnungen (ungenutzt, pre-existing) — keine Errors.
