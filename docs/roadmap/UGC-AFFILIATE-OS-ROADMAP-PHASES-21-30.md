# UGC Affiliate OS — Roadmap Phase 21–30

Status: verbindliche Erweiterung der Phasen 1–20  
Stand: 2026-08-18

Diese Phasen erweitern ausschließlich das UGC Affiliate OS. Die gleich nummerierten
CarryOS-Branchenbände sind ein separater Plan und werden nicht in dieses Repository
eingebaut.

| Phase | Bezeichnung | Kernresultat |
|---:|---|---|
| 21 | BYOK Provider Gateway | Kunden integrieren eigene AI-/Media-APIs; Free-First-Routing und kontrollierter Fallback |
| 22 | Creator Production Cockpit | Interaktiver End-to-End-Arbeitsplatz für Research, Script, Media und Publishing |
| 23 | Omni-Channel Revenue Engine | Affiliate-, Creator-, Sponsoring-, Streaming- und Commerce-Umsätze in einer Steuerung |
| 24 | Audience & CRM Intelligence | Consent-basierte Zielgruppen-, Lead-, Community- und Relationship-Intelligence |
| 25 | Campaign Portfolio Optimizer | Portfolio-, Budget-, Kapazitäts- und Kanalplanung mit Approval-Gates |
| 26 | Creator & UGC Marketplace | Rechtegeprüfte Creator-, Asset-, Briefing-, Auftrag- und Abnahmeprozesse |
| 27 | Commerce & Offer Engine | Offer-, Bundle-, Landingpage-, Preis-, Checkout- und Conversion-Orchestrierung |
| 28 | Trust, Legal & Compliance Center | Claims, Rechte, Disclosures, Consent, Retention und Compliance Evidence |
| 29 | Executive Control Plane | CEO/COO/CFO-Cockpit, Szenarien, Safe Mode, Kill Switches und Business Reviews |
| 30 | Enterprise Go-Live | Produktionsmigration, SLO/DR/Security/Finance-Gates und kontrollierter Rollout |

## Phase 21 — BYOK Provider Gateway

### Ziel

Jeder Workspace kann eigene API-Zugänge für LLM, Bild, Video, Voice, Avatar,
Search und Automation verbinden. Secrets bleiben im Vault. Das Routing folgt
Free Tier → günstigster geeigneter Provider → Premium nur per Policy/Freigabe.

### Pflichtumfang

- Provider Catalog und Capability Registry
- Workspace Provider Connections ohne Secret-Rückgabe
- verschlüsselte Credentials und Rotation
- Model Catalog, Capability-, Region- und Kostenmetadaten
- Routing Policies mit Allow-/Deny-Listen, Budgets und Fallback-Ketten
- Health Checks, Circuit Breaker, Rate Limits und Quotas
- OmniRoute/OpenRouter als optionale Gateways, keine Pflichtabhängigkeit
- Bring-Your-Own-API-Onboarding und Verbindungstest
- Usage-, Cost- und Failure-Metering
- Audit, RBAC, Kill Switch und Credential Revocation
- Contract Tests für Adapter und Cross-Tenant-Negativtests

### Gates

- Kein Secret in API-Antwort, Log, Event oder Prompt
- Kein Provider-Aufruf ohne Workspace, Capability und Policy Snapshot
- Premium-/kostenpflichtiger Fallback nur innerhalb Budget/Approval
- Deaktivierte oder fehlerhafte Verbindung wird nicht geroutet
- Providerwechsel bleibt nachvollziehbar und idempotent

## Phase 22 — Creator Production Cockpit

Interaktive Tafeln, Agenten-Live-Ansicht, Markdown-Arbeitsfenster, Produktionsstatus,
Versionen, Freigaben und nachvollziehbare Agentenaktionen. Kein direkter Bypass der
Phase-4- bis Phase-6-Gates.

## Phase 23 — Omni-Channel Revenue Engine

Normalisierte Einnahmequellen, Revenue Contracts, Reconciliation, Profit pro
Content/Product/Channel und getrennte Ist-/Schätzwerte.

## Phase 24 — Audience & CRM Intelligence

Consent-basierte Kontakte, Segmente, Community-Signale, Journeys und Relationship
Scoring. Keine Sammlung oder Aktivierung ohne Rechtsgrundlage und Opt-out.

## Phase 25 — Campaign Portfolio Optimizer

Kapazitäts-, Budget-, Risiko- und ROI-basierte Portfolioentscheidungen mit
Szenarien, Approval und Rollback. Keine autonome Budgeterhöhung.

## Phase 26 — Creator & UGC Marketplace

Creator Profiles, Rechte/Consent, Briefings, Angebote, Aufträge, Deliverables,
Abnahmen und Auszahlungen. Identität und Rechte werden nicht durch KI behauptet.

## Phase 27 — Commerce & Offer Engine

Offers, Bundles, Landingpage-Varianten, Checkout-Adapter und Conversion Events.
Preise, Verträge und Zahlungsbedingungen bleiben governancepflichtig.

## Phase 28 — Trust, Legal & Compliance Center

Claim Registry, Evidence, Rechteketten, Disclosures, Consent, Lösch-/Retention-
Workflows, Export und Compliance Cases. Keine Rechtsberatung durch das System.

## Phase 29 — Executive Control Plane

Executive Objectives, Business Health, Szenarien, Approval Inbox, Safe Mode,
Kill Switches sowie Daily/Weekly/Monthly Reviews.

## Phase 30 — Enterprise Go-Live

### Abschlussgates

- PostgreSQL-Migration und Restore-Test
- Cross-Tenant-, RBAC-, Vault- und API-Security-Tests
- Typecheck, Lint, Unit, Integration, Contract, E2E und Build grün
- Last-, Retry-, DLQ-, Provider-Failover- und Kill-Switch-Tests
- SLO, Runbooks, Incident-, Backup-, DR- und Rollback-Nachweise
- DSGVO-/Compliance- und Finance-Hinweise fachlich geprüft
- Canary-Rollout mit messbaren Go/No-Go-Kriterien

Keine Phase gilt allein durch Code oder Vercel-Build als abgeschlossen.
