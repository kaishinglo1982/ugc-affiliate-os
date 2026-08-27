# UGC Affiliate OS — CarryOS Plugin Runtime Roadmap

Stand: 27. August 2026  
Repository: `kaishinglo1982/ugc-affiliate-os`

## 1. Architekturentscheidung

UGC Affiliate OS wird als **CarryOS-Fachplugin** weiterentwickelt. Das Plugin darf eigene Domain-Services, Persistenz, Workflows und Fachagenten besitzen, baut aber **keine zweite CarryOS-Core-Laufzeit** auf.

Zielpfad:

`UGC/YouWare UI -> UGC Affiliate Plugin Service/BFF -> CarryOS Core -> Agent Runtime / Workflow Runtime / AI Gateway`

Der Browser darf CarryOS-`tenantId`, Provider-Keys oder Core-Secrets nicht frei setzen. Tenant-/Workspace-Bindung wird serverseitig aufgelöst und geprüft.

## 2. Ownership

### CarryOS Core besitzt

- Auth / Tenant / RBAC;
- zentrale Agent Runtime und Agent Catalog;
- AI Gateway mit Priorität `OpenCode Go -> OmniRoute -> OpenCode Zen`;
- Shared Memory / RAG Infrastructure;
- PII-Egress Policy;
- Audit / Observability;
- Budget / Token Ledger / FinOps;
- Queue / Worker / Backpressure / DLQ;
- Approval Foundation / Kill Switch / Rollback;
- gemeinsame Social-, Ads- und Publishing-Connector-Frameworks;
- direkte Meta-/Google-Ads-Plattformadapter, sofern shared;
- Secret-/Credential-Management und AES-256-GCM-Grenzen.

### UGC Affiliate OS besitzt

- Commerce Core;
- Affiliate-Domainlogik;
- Product Opportunity Scoring;
- Profitability-/Margin-Logik;
- Attribution und Conversion Events;
- Affiliate-Netzwerk-spezifische Adapter, sofern nicht global wiederverwendbar;
- Ghost-Brand-Domainmodelle;
- UGC-/Creator-/Content-Domainworkflows;
- Produkt-/Offer-/Campaign-Domainmodelle;
- Fachprompts, Fachpolicies und Domain-Templates;
- UGC-/Commerce-spezifische UI;
- domainspezifische Persistenz.

**Nicht in CarryOS Core verschieben:** Commerce Core, Attribution, Profitability und Affiliate-spezifische Geschäftsregeln.

## 3. Eigene UGC-/Commerce-Agenten

UGC Affiliate OS besitzt eigene Fachagenten. Sie werden über die zentrale CarryOS-Agent-Runtime ausgeführt und halten keine eigenen direkten OpenCode-/OmniRoute-/Zen-Keys.

Geplante Fachagenten:

1. Product Opportunity Agent
2. Affiliate Offer Scoring Agent
3. Product Research Agent
4. Profitability Agent
5. Attribution Agent
6. Ghost Brand Agent
7. UGC Content Planner
8. Script & Hook Agent
9. Social Publishing Agent
10. Trend Agent
11. SEO / Ghostwriter Agent
12. YouTube / Shorts Agent
13. Conversion Analysis Agent
14. Compliance / Approval Agent

Jeder Agent definiert fachlich:

- Capability/Use Case;
- Input-/Output-Zod-Contract;
- Prompt/Policy;
- erlaubte Tools;
- Domain Memory Scope;
- Approval-/Cost-Klasse;
- Retry-/Idempotenz-Regeln.

CarryOS übernimmt technisch:

- Provider-Routing;
- PII-Filter;
- Budget-/Token-Kontrolle;
- Audit;
- Circuit Breaker;
- Queueing;
- Failover;
- Runtime Telemetry.

## 4. Phasen UGC-P10 bis UGC-P20

### UGC-P10 — Plugin Contract Foundation

- CarryOS Plugin Manifest/Contract;
- Capability Registry;
- serverseitige Tenant-/Workspace-Bindung;
- BFF-to-Core Auth Contract;
- Zod für Request/Event Boundaries;
- keine zweite Auth- oder Agent Runtime.

### UGC-P11 — Plugin Service / BFF

- eigener UGC Affiliate Plugin Service;
- Domain API für Products, Offers, Campaigns, Attribution und Content;
- serverseitiger CarryOS Core Client;
- keine Provider-Keys im Browser;
- Rate Limits, Audit Correlation IDs, Idempotenz.

### UGC-P12 — Commerce Core Consolidation

- vorhandene Product-Score-/Opportunity-Dubletten auf einen Domain-Kern reduzieren;
- ConversionEvent, TrackingTouch, AttributionEvent sauber persistieren;
- Profitability und Product Scoring als einzige Domain-Truth;
- keine Business-Logik in Route Handlern.

### UGC-P13 — UGC Agent Registry

- Fachagenten registrieren;
- zentrale CarryOS-Ausführung;
- `OpenCode Go -> OmniRoute -> OpenCode Zen` nur über CarryOS;
- Provider-/Model-/Usage-Metadaten an UGC UI zurückgeben.

### UGC-P14 — Affiliate Network Layer

- Amazon/Awin/CJ/Impact/Rakuten/weitere Adapter nur soweit rechtlich und technisch verfügbar;
- Connector Capability Metadata;
- Retry/Idempotenz/Audit;
- Credentials ausschließlich serverseitig und verschlüsselt;
- BYO Credentials als kontrollierter Onboarding-Pfad.

### UGC-P15 — Ghost Brand & Content Factory

- Brand Memory;
- Product-to-Brief;
- Hook/Script/Caption/SEO/Ghostwriter;
- Cross-Channel Variants;
- Human Approval vor Publishing, wenn Policy dies verlangt.

### UGC-P16 — UGC Media Studio

- Self-shot Upload/Repurpose als Low-Cost-Primärpfad;
- Premium Video Provider nur über kontrollierte Adapter;
- Budget-/Approval-Gates pro Videojob;
- keine externen Image-URLs als UI-Abhängigkeit;
- Asset Metadata und Rights Tracking.

### UGC-P17 — Publishing & Social Orchestration

- gemeinsame CarryOS Publisher/Connector-Capabilities nutzen;
- keine duplizierten Meta-/Google-/Social-Core-Connectoren;
- Scheduling, Retry, Idempotenz, DLQ;
- Multi-Account-Scope tenant-/workspace-sicher.

### UGC-P18 — Attribution & Profitability Intelligence

- Click/Touch/Conversion Attribution;
- Revenue/Commission/Cost/Contribution Margin;
- Cost-to-Outcome pro Agent/Workflow;
- keine erfundenen ROAS-/Conversion-KPIs;
- Domain-Truth bleibt UGC Plugin.

### UGC-P19 — YouWare Experience Layer

- UGC Affiliate UI kann auf YouWare veröffentlicht werden;
- YouWare ist Experience Layer, nicht Security-/Data-Source-of-Truth;
- API-Aufrufe ausschließlich über Plugin Service/BFF;
- keine Core-Secrets oder freien tenantIds im Client;
- keine toten Buttons oder produktiven Mockdaten.

### UGC-P20 — Enterprise Go-Live Gate

Go-Live erst wenn:

1. TypeScript strict, `any = 0` in neuem/geändertem Code;
2. tenant-/workspace-gebundene Reads/Writes serverseitig gescoped sind;
3. PII vor externem API-/LLM-Egress gefiltert wird;
4. Secrets/Tokens verschlüsselt und nicht im Client vorhanden sind;
5. Agenten über CarryOS Runtime laufen;
6. keine zweite Auth-/Memory-/AI-Routing-/Queue-Core-Laufzeit existiert;
7. Commerce Core/Attribution/Profitability eindeutig im Plugin bleiben;
8. Queue Backpressure, Kill Switch und DLQ nachgewiesen sind;
9. Publishing-/Cost-/Compliance-Aktionen Approval-Gates besitzen;
10. Typecheck, Lint, Tests, E2E und Build grün sind;
11. keine Mock-Connected-States/Fake-Metriken/Fake-Erfolge produktiv existieren.

## 5. Deployment-Ziel

Empfohlene Endstruktur:

```text
YouWare / UGC Affiliate UI
          |
          v
UGC Affiliate Plugin Service / BFF
          |
          +--> UGC Domain DB / Commerce / Attribution / Profitability
          |
          v
CarryOS Core
  |- Auth / Tenant / RBAC
  |- Agent Runtime
  |- AI Gateway: OpenCode Go -> OmniRoute -> OpenCode Zen
  |- Shared Memory/RAG
  |- Queue/Worker
  |- Audit/FinOps
  |- Shared Connectors
  |- Approval/Kill Switch/DLQ
```

Das Plugin darf separat deployed werden. CarryOS Core muss nicht im selben Deployment laufen, solange der serverseitige Contract, Tenant-Kontext, Security und Observability eingehalten werden.

## 6. Nicht verhandelbare Regeln

- kein produktives `any`;
- keine realen API Keys in Repo, Prompts oder Client;
- keine zweite CarryOS-Core-Laufzeit;
- keine produktiven Mock-Erfolge;
- keine erfundenen Kunden/KPIs;
- PII-Filter vor externem Egress;
- sensitive persistierte Credentials verschlüsseln;
- fachliche UGC-/Affiliate-Logik bleibt im Plugin;
- shared Infrastruktur wird aus CarryOS konsumiert statt kopiert.
