# UGC Affiliate OS — Gesamtroadmap Phase 1–20

> Zentrale, verbindliche Produkt- und Implementierungsroadmap für das Repository `kaishinglo1982/ugc-affiliate-os`.
>
> Status: Planungsstand vollständig. Die einzelnen Phasen gelten erst dann als implementiert, wenn ihre jeweiligen Definition-of-Done-Gates durch Tests, Dokumentation und Audit nachgewiesen sind.

## Leitprinzipien

- **Free API / Free Tier first**, danach günstigster geeigneter Provider, Premium nur per Policy oder Freigabe.
- **Keine parallelen Kernstrukturen**: Bestehende Modelle und Plattformdienste erweitern, statt sie zu duplizieren.
- **Mandanten- und Workspace-Isolation**, RBAC, Audit, verschlüsselte Credentials und Least Privilege in jeder Phase.
- **Keine unkontrollierte Autonomie**: Budget-, Risiko-, Compliance-, Approval- und Kill-Switch-Grenzen gelten systemweit.
- **Providerunabhängigkeit** durch SDKs, Adapter, Capability-Registries und Contract Tests.
- **Keine ungeprüften Fakten oder Claims**: Evidence, Confidence, Freshness und Quellenherkunft bleiben nachvollziehbar.
- **Keine `any`-Typen** im produktiven TypeScript-Code.
- Jede Phase benötigt: Datenmodelle, Zod-Schemas, Services, APIs, Events, Jobs, RBAC, Audit, Observability, Tests und Dokumentation.

---

## Gesamtübersicht

| Phase | Bezeichnung | Kernresultat |
|---:|---|---|
| 1 | Foundation | Sichere technische Plattformbasis |
| 2 | Affiliate Core | Provider, Produkte, Links, Klicks, Provisionen und Payouts |
| 3 | Product Intelligence | Research, Scoring, Trends, Nischen und Opportunities |
| 4 | AI Content Factory | Briefs, Hooks, Skripte, Storyboards und Production Packages |
| 5 | AI Video Studio | Bilder, Video, Voice, Avatar, Timeline und Renderings |
| 6 | Publishing Engine | Accounts, Kalender, Scheduling und Publishing |
| 7 | Analytics & Attribution | Durchgängige Mess- und Umsatzzuordnung |
| 8 | AI Optimization | Experimente, Gewinnererkennung und kontrollierte Optimierung |
| 9 | Finance & Tax | Einnahmen, Kosten, Cashflow, Belege und Steuerprognosen |
| 10 | Agentic Automation | Dauerhafte, policygesteuerte End-to-End-Workflows |
| 11 | Ghost Brand Manager | Markenportfolios, Brand Context und Brand Health |
| 12 | Multi-Account Operations | Sichere Verwaltung vieler Kanäle und Berechtigungen |
| 13 | AI Employees | Digitale Abteilungen, Rollen, Skills und Task Routing |
| 14 | Learning & Memory | Kontrolliertes Langzeitgedächtnis und Lessons |
| 15 | Plugin Marketplace | Sichere Erweiterungsplattform und Marketplace |
| 16 | No-Code Workflow Builder | Visuelle Erstellung und Simulation von Workflows |
| 17 | AI Agency Platform | Kundenmandanten, White Label, SLA und Billing |
| 18 | Enterprise Scaling | Multi-Region, HA, DR, SLO und FinOps |
| 19 | CarryOS Integration | UGC Affiliate OS als integriertes CarryOS-Modul |
| 20 | Autonomous Agency | Policy-governed, kontrollierte End-to-End-Autonomie |

---

# Phase 1 — Foundation

## Ziel

Aufbau einer produktionsfähigen Grundlage für das gesamte UGC Affiliate OS.

## Kernumfang

- Next.js App Router und TypeScript strict.
- PostgreSQL und Prisma mit sauberer Migration Governance.
- Workspace-/Tenant-Kontext und Row-Level-Isolation.
- Authentifizierung, Sessions, MFA-/Passkey-Vorbereitung.
- RBAC und Permission Registry.
- AES-256-GCM Credential Vault mit Rotation und Maskierung.
- Audit Log, Correlation IDs und unveränderbare Sicherheitsereignisse.
- Redis/BullMQ Event-, Job- und Dead-Letter-Grundlage.
- Feature Flags, Licensing Foundation und Provider Registry.
- Storage-Abstraktion für lokale Entwicklung und S3-kompatible Produktion.
- zentrale Zod-Validierung und standardisierte Fehlerbehandlung.
- OpenTelemetry/Sentry-kompatible Logs, Traces und Metrics.
- CI/CD mit Typecheck, Lint, Tests, Build und Migration Checks.

## Verbindliche Gates

- Keine Route ohne Auth-, Scope- und Input-Prüfung.
- Keine Secrets in UI, Logs, Events oder Agentenprompts.
- Idempotency für kritische Write-Aktionen.
- Unit-, Integration- und E2E-Tests für Auth, RBAC, Vault, Queue und Isolation.
- `typecheck`, `lint`, `test`, `build` und `validate:deploy` grün.

---

# Phase 2 — Affiliate Core

## Ziel

Providerunabhängige Verwaltung des gesamten Affiliate-Lebenszyklus.

## Kernumfang

- Affiliate Provider SDK und Connector Registry.
- Programme, Merchant Accounts und verschlüsselte Credentials.
- Produktfeeds, Produktnormalisierung, Varianten, Preise und Verfügbarkeit.
- Affiliate Links, Deep Links, Sub-IDs und UTM-Parameter.
- Click- und Redirect-Tracking mit Bot-/Fraud-Grundschutz.
- Transaktionen, Statusänderungen, Stornos und Refunds.
- Provisionen, Payouts und Abgleich mit Providerreports.
- API-, Webhook-, CSV- und manueller Import.
- Provider Capability Mapping und Rate-Limit-Verwaltung.
- Startprovider: Amazon, eBay, Awin, Impact, CJ, Rakuten und erweiterbare Connectoren.

## Verbindliche Gates

- Provider-Rohdaten und normalisierte Daten bleiben getrennt.
- Imports sind idempotent, paginiert und resumierbar.
- Keine doppelte Transaktion oder Auszahlung.
- Links enthalten reproduzierbare Attribution-Referenzen.
- Contract Tests für jeden Connector.

---

# Phase 3 — AI Research & Product Intelligence Engine

## Ziel

Belastbare Auswahl und Priorisierung profitabler Affiliate-Produkte.

## Kernumfang

- Research Runs, Sources und Evidence Management.
- Product Intelligence Profiles.
- Nachfrage-, Trend-, Wettbewerb-, Profitabilitäts-, Content-, Plattform-, Zielgruppen-, Trust-, Risk-, Confidence- und Freshness-Scores.
- Markt-, Wettbewerber-, Keyword- und Audience Intelligence.
- Opportunity Detection und Product Ranking.
- Niche Discovery und Seasonality Engine.
- Product Watchlists und Alerts.
- Research Supervisor plus spezialisierte Agents.
- Free-First-Quellenwahl und Research Budgets.
- Knowledge-Graph-Foundation für Product, Brand, Niche, Audience, Keyword, Trend, Platform und Evidence.

## Verbindliche Gates

- Jede Empfehlung ist durch Evidence erklärbar.
- LLM-Ausgaben gelten nicht automatisch als Fakten.
- Niedrige Confidence verhindert starke Empfehlungen.
- Scoreformeln sind versioniert und testbar.
- Veraltete Daten werden abgewertet und lösen Refresh aus.

---

# Phase 4 — AI Content Factory

## Ziel

Intelligence-Daten in freigabefähige, strukturierte Content-Produktionspakete umwandeln.

## Kernumfang

- Campaigns, Content Briefs und Content Concepts.
- Content Angles, Hooks, Skripte und Szenen.
- Storyboards, Frames, Shotlists und Visual Prompts.
- Voiceover-Texte, Captions, Titel, Beschreibungen, CTAs, SEO und Hashtags.
- UGC-, Faceless-, Avatar-, Vergleichs-, Review-, Tutorial- und Story-Templates.
- Brand Voice, Prompt Registry und Prompt-Versionierung.
- Plattformadapter und mehrsprachige Lokalisierung.
- A/B-Varianten mit genau definierten Änderungsdimensionen.
- Claim Management, Affiliate Disclosure, Compliance und Quality Gates.
- Production Package als maschinenlesbarer Phase-5-Handoff.

## Verbindliche Gates

- Agentenausgaben werden über Zod-Schemas validiert.
- Keine ungeprüften Claims oder erfundenen Testimonials.
- Externe Research-Inhalte werden als nicht vertrauenswürdige Daten behandelt.
- Änderungen und Freigaben sind versioniert und auditierbar.
- Kein finaler Produktionshandoff ohne Compliance- und Quality-Pass.

---

# Phase 5 — AI Video Studio

## Ziel

Freigegebene Production Packages in technisch fertige Medienpakete umwandeln.

## Kernumfang

- Provider Router für Bild, Video, Voice, Avatar, Musik und Rendering.
- Text-to-Image, Image-to-Image, Text-to-Video, Image-to-Video und Video-to-Video.
- Provideradapter für Higgsfield, Veo, Kling, Runway, Pika, WaveSpeed, Flux, OpenAI Images, ElevenLabs, HeyGen und weitere.
- Asset Library mit Checksums, Herkunft, Rechten und Wiederverwendung.
- Voice Profiles und consentpflichtiges Voice Cloning.
- Avatar Profiles, Lip Sync und Rechteverwaltung.
- Subtitle Engine, SRT/VTT und Burned-in Captions.
- Timeline JSON mit Tracks, Clips, Übergängen, Text, Branding, Musik und Audio Mixing.
- Preview- und Final-Rendering, Multi-Format-Exporte und Smart Reframing.
- Thumbnail Generation und Quality/Compliance Agents.

## Verbindliche Gates

- Keine reale Person oder Stimme ohne dokumentierte Zustimmung imitieren.
- Produktmerkmale dürfen nicht irreführend verändert werden.
- Kosten werden vor Generierung geschätzt und limitiert.
- Rechte, Lizenzen und KI-Herkunft werden gespeichert.
- Technische Validierung prüft Codec, Dauer, Auflösung, Audio und Dateiintegrität.

---

# Phase 6 — Publishing Engine

## Ziel

Freigegebene Medien sicher und planbar auf Plattformen veröffentlichen.

## Kernumfang

- Social Account Connections über offizielle OAuth-Verfahren.
- Token Lifecycle, Scope Tracking und Account Health.
- Plattformadapter für YouTube, TikTok, Instagram und Facebook; danach Pinterest, LinkedIn, X, Threads, Reddit, Blog und Newsletter.
- Publishing Posts, Drafts, Schedules und Calendar.
- Plattformvalidierung für Format, Dauer, Caption, Thumbnail, Untertitel und Disclosure.
- Cross-Platform-Varianten und plattformspezifische Metadaten.
- Affiliate-Link-, Sub-ID- und UTM-Mapping.
- Duplicate Prevention und Idempotency.
- Retry, Backoff, Dead Letter und Manual Publishing Packages.
- externe Post-ID, URL und Analytics Reference.

## Verbindliche Gates

- Keine Veröffentlichung ohne gültige Freigabe und Disclosure.
- Keine Account-Erstellung oder Schutzmechanismus-Umgehung.
- Token und Secrets ausschließlich im Vault.
- Jeder Plattformpost hat eigenen Status und Fehlerverlauf.
- Publishing ist idempotent und verhindert Doppelposts.

---

# Phase 7 — Analytics, Attribution & Performance Intelligence

## Ziel

Durchgängige Messkette von Content und Publishing bis Conversion, Provision und operativem Profit.

## Kernumfang

- Raw Ingestion und normalisierte Analytics Observations.
- Social Metrics: Views, Watch Time, Retention, Engagement, Follows und Clicks.
- Affiliate Metrics: Transactions, Conversion, Commission, Refunds und Payouts.
- Cost- und Profit-Metrics.
- versionierte Metric Formula Registry.
- Entity Resolution über External IDs, Sub-IDs, Links, Campaigns und UTMs.
- Attribution Models: Direct, Last Click, First Click, Linear, Time Decay, Provider Report und Custom Rules.
- Attribution Confidence und Unattributed Revenue.
- Funnels, Cohorts, Time Series und Content Decay.
- Hook-, Script-, CTA-, Thumbnail-, Product-, Platform-, Account- und Campaign-Performance.
- Data Quality, Freshness, Anomaly Detection, Reports und Alerts.
- Optimization Signals für Phase 8.

## Verbindliche Gates

- Providerdaten bleiben unverändert referenzierbar.
- Schätzwerte sind klar gekennzeichnet.
- KPI-Formeln sind versioniert.
- Attribution zeigt Confidence und Begründung.
- Rohdaten, Normalisierung und Aggregation sind reproduzierbar.

---

# Phase 8 — AI Optimization & Experimentation Engine

## Ziel

Kontrollierte Verbesserung auf Basis realer Daten statt unkontrollierter Selbstoptimierung.

## Kernumfang

- Optimization Recommendations mit Hypothese, Kosten, Risiko und Confidence.
- A/B-, Holdout-, Sequential-, Platform-, Timing-, Product- und Cost-Experimente.
- Control Groups, Minimum Sample Size, Runtime und Guardrail Metrics.
- Hook-, Script-, CTA-, Caption-, Title-, Thumbnail-, Retention- und Conversion-Optimierung.
- Product-, Platform-, Timing- und Frequency-Optimizer.
- Cost- und Provider-Optimizer.
- Content Refresh und Fatigue Detection.
- Winner, Likely Winner, No Difference, Inconclusive und Guardrail Failed.
- Auto-Execution Policies nur für reversible Low-Risk-Aktionen.
- Rollback für jede automatische Änderung.

## Verbindliche Gates

- Kein Gewinner ohne Mindestdaten und Data Quality.
- Möglichst nur eine Variable pro Experiment ändern.
- Keine automatische Budgeterhöhung.
- Guardrail-Verletzung löst Pause oder Rollback aus.
- Jede Änderung besitzt Vorversion, Zielmetriken und Beobachtungsfenster.

---

# Phase 9 — Finance, Accounting & Tax Engine

## Ziel

Integrierte operative Finanzsicht mit Buchhaltungs- und Steuerprognose-Grundlage.

## Kernumfang

- Financial Accounts, Transactions, Revenue und Expenses.
- Affiliate-, Streaming-, Sponsoring-, Ad- und Service-Revenue.
- AI-, Media-, Voice-, Avatar-, Storage-, Hosting-, Tool-, Advertising- und Overhead-Kosten.
- Cost Allocation auf Workspace, Brand, Campaign, Product, Content, Post, Experiment und Agent.
- Receipts, Invoices, Recurring Expenses und Dokumentprüfung.
- Currency Engine mit historischen Wechselkursen.
- VAT Foundation, Tax Estimates und Tax Reserve.
- Cashflow, Budgets, Forecasts, Runway und Szenarien.
- Payout-, Bank- und Payment-Reconciliation.
- Booking Proposals, Period Closing und Sperren.
- CSV-, Excel-, PDF- und DATEV-Export-Foundation.

## Verbindliche Gates

- Brutto, Netto, Steuer, Gebühr und Originalwährung getrennt speichern.
- Steuerwerte sind Schätzungen und keine Beratung.
- Geschlossene Perioden dürfen nicht still verändert werden.
- Korrekturen benötigen Referenz, Grund und Audit.
- Buchungs- und DATEV-Mapping muss fachlich geprüft werden.

---

# Phase 10 — Automation & Agentic Operations Engine

## Ziel

Alle Module zu dauerhaften, kontrollierten End-to-End-Workflows verbinden.

## Kernumfang

- Workflow Definitions, Steps, Executions, Triggers und Schedules.
- Event-, Schedule-, Manual-, API-, Webhook- und Condition-Trigger.
- Action-, Agent-, Condition-, Parallel-, Wait-, Approval-, Sub-Workflow-, Compensation- und Manual-Task-Steps.
- persistente, resumierbare Workflow Runtime.
- Human-in-the-Loop und Approval Matrix.
- Rule Engine ohne `eval` oder beliebige Codeausführung.
- Retry, Timeout, Compensation und Dead-Letter-Verarbeitung.
- Concurrency Policies und Idempotency.
- Cost, Risk und Compliance Guards.
- Daily, Weekly und Monthly Operations Agents.
- Incident Management, Health Checks, Runbooks und Kill Switches.

## Verbindliche Gates

- Agenten erhalten nur explizite Capabilities und Tools.
- Keine Workflow-Ausführung ohne Policy Snapshot.
- Laufende Workflows bleiben auf fixer Version.
- Keine Endlosschleifen oder unbegrenzte Sub-Workflows.
- Level 0–3 Autonomie vollständig; Level 4 nur vorbereitet.

---

# Phase 11 — Ghost Brand & Brand Portfolio Manager

## Ziel

Vollständige Markenportfolios mit eigener Identität, Strategie und Betriebslogik verwalten.

## Kernumfang

- Brand Portfolios und Brands.
- Brand Identity, Positioning, Voice und Visual Identity.
- Niche- und Audience-Assignments.
- Product Portfolio mit Hero, Core, Trend, Seasonal und Experimental Products.
- Brand Account und Affiliate Program Mapping.
- Brand Context für alle nachgelagerten Workflows.
- Brand Policies für Produkte, Plattformen, Claims, Budgets und Autonomie.
- Brand Budgets, Finance, Analytics und Automationsvorlagen.
- Brand Health, Conflict Detection, Kannibalisierung und Portfolio Strategy.
- Lifecycle: Idea, Validation, Setup, Testing, Active, Growing, Mature, Declining, Paused, Archived, Retired.
- Domain-, Handle-, White-Label- und Client-Brand-Foundation.

## Verbindliche Gates

- Credentials werden beim Duplizieren niemals kopiert.
- Kein markenspezifischer Workflow ohne Brand Context.
- Namens- und Markenprüfung wird nicht als verbindliche Rechtsprüfung ausgegeben.
- Brand Kill Switch und Archivierungsprozess vorhanden.
- Brand- und Workspace-Isolation getestet.

---

# Phase 12 — Multi-Account, Identity & Channel Operations

## Ziel

Viele autorisierte Accounts, Kanäle, Seiten und Plattformobjekte sicher betreiben.

## Kernumfang

- Managed Accounts, Groups, Hierarchies und Ownership.
- YouTube Channels, Meta Business/Page/Instagram, TikTok Business und weitere Plattformobjekte.
- Account Connections, OAuth, Token Lifecycle und Reauthorization.
- Scope Sets, Permission Assignments und Least Privilege.
- normalisierte Account Roles.
- Agent Account Context und Capability Boundaries.
- Account Health, Risk, Capacity und Rate-Limit Budgets.
- Publishing Conflict Detection und accountbezogene Kalenderplanung.
- Client-Owned Accounts und dokumentierte Recovery-Kontakte.
- Recovery Cases, Manual Tasks, Activity Logs und Compliance.

## Verbindliche Gates

- Keine CAPTCHA-, Geräte-, Session-, Proxy- oder Identitätsumgehung.
- Keine automatische Account-Erstellung ohne offiziellen autorisierten Prozess.
- Keine automatische Scope-Erweiterung.
- High/Critical Risk kann Publishing und Automation pausieren.
- Kill Switch pro Account.

---

# Phase 13 — AI Employees & Digital Workforce

## Ziel

Eine strukturierte digitale Belegschaft statt einer losen Agentensammlung.

## Kernumfang

- Departments, Teams, Positions und Digital Org Chart.
- AI Employees mit Employee Number, Position, Supervisor, Autonomy Level und Lifecycle.
- Skills, Capabilities, Tools, Brand-, Client- und Account-Assignments.
- Workforce Tasks und typisierte Inputs/Outputs.
- Task Routing nach Skills, Rechten, Qualität, Kosten, Sprache und Auslastung.
- Workload, Concurrency, Schedules, Shifts und Vertretungen.
- Delegation und begrenzte Subdelegation.
- Performance, Quality Review, Peer Review und Human Correction Rate.
- Agent Cost, ROI-Schätzung und Department Reporting.
- Onboarding, Probation, Training Foundation, Health und Offboarding.

## Verbindliche Gates

- Keine Agenten-Selbstaktivierung oder Selbstvermehrung.
- Delegation erweitert niemals Rechte.
- Probephase hat reduzierte Rechte und Human Review.
- Offboarding entzieht Tools, Accounts und Credentials zuverlässig.
- Kill Switch pro Agent und Team.

---

# Phase 14 — Learning, Memory & Continuous Improvement

## Ziel

Kontrolliertes Langzeitgedächtnis mit überprüfbaren Lessons und Improvement Proposals.

## Kernumfang

- Working, Episodic, Semantic und Procedural Memory.
- Learning Signals, Feedback Events und Outcome Events.
- Memory Scopes: System, Workspace, Portfolio, Brand, Client, Account, Product, Campaign, Agent, Workflow und User.
- Knowledge Graph mit versionierten Nodes, Edges und Relationship Scores.
- Similarity Search und sichere Retrieval Policies.
- Confidence, Freshness, Decay, Consolidation und Merge.
- Pattern und Contradiction Detection.
- Brand, Product, Content, Agent, Workflow und Error Memory.
- Lessons mit Evidence und Scope.
- Prompt-, Workflow-, Template-, Score- und Skill-Improvement Proposals.
- Curator Review, Rollback und Learning Write Kill Switch.

## Verbindliche Gates

- Menschliche Korrekturen haben Priorität.
- Keine autonome Policy-, Rechte- oder Promptänderung.
- Keine Cross-Tenant-Rohdaten oder ungeprüfte globale Generalisierung.
- Prompt Injection und Knowledge Poisoning werden abgewehrt.
- Memories sind korrigierbar, archivierbar und löschbar.

---

# Phase 15 — Plugin Marketplace & Extension Platform

## Ziel

Neue Provider, Agenten, Workflows und Funktionen sicher ergänzen, ohne den Kern zu forken.

## Kernumfang

- Plugin SDK, Manifest, Definition, Version und Installation.
- Categories für Connector, Provider, Agent, Workflow, UI, Template, Exporter, Report, Ruleset und Knowledge Pack.
- Publisher Model, Verification, Signing und Checksums.
- Permission Grants, Data Scopes, Tool Scopes, Events, Jobs, Secrets und Network Policies.
- isolierte Plugin Runtime und Sandbox.
- Secret Broker mit kurzlebigem Zugriff.
- Compatibility, Dependencies und Contract Tests.
- Marketplace Catalog, Listings, Reviews und Ratings.
- Licensing, Usage Metering und Billing Foundation.
- Update Policies, Permission Diff, Rollback und Uninstall.
- Plugin Health, Security Review, Moderation und Kill Switch.

## Verbindliche Gates

- Kein direkter Datenbank-, Host-Dateisystem- oder Shellzugriff.
- Nicht deklarierte Fähigkeiten sind nicht verfügbar.
- Neue Berechtigungen bei Updates benötigen erneute Freigabe.
- Produktionsplugins sind signiert und gescannt.
- Workspace-Daten bleiben bei Deinstallation kontrolliert erhalten oder exportierbar.

---

# Phase 16 — Visual No-Code Workflow Builder

## Ziel

Phase-10-Workflows visuell erstellen, testen, simulieren und veröffentlichen.

## Kernumfang

- Canvas, Nodes, Edges, Ports, Minimap, Auto Layout und Collaboration.
- Trigger-, Action-, Agent-, Condition-, Approval-, Wait-, Loop-, Parallel-, Sub-Workflow-, Notification-, Manual-Task-, Compensation- und Plugin-Nodes.
- typisierte Port- und Schema-Systeme.
- Variables, Secret References und Data Mapping.
- Expression Builder ohne beliebige Codeausführung.
- Loop-, Runtime-, Depth-, Cost- und Concurrency-Limits.
- Structural, Schema, Permission, Policy, Cost und Risk Validation.
- Dry Run, Test Datasets und Fehlersimulation.
- Compilation in die Phase-10-Runtime.
- Review, Approval, Publish, Version Diff und Rollback.
- Templates, Import und Export ohne Secrets.
- Live Execution Overlay.

## Verbindliche Gates

- Keine Code-, Shell- oder SQL-Nodes.
- Inkompatible Ports können nicht verbunden werden.
- Unbegrenzte Schleifen und unkontrollierte Zyklen werden blockiert.
- Veröffentlichte Versionen sind unveränderbar.
- Workflows ohne Pflichtfehlerpfade oder erforderliche Freigaben werden nicht publiziert.

---

# Phase 17 — AI Agency, Multi-Tenant Client Operations & White Label

## Ziel

Das System als sichere AI-Agency-Plattform für mehrere Kunden betreiben.

## Kernumfang

- Client Organizations, Client Workspaces und Tenant Context.
- Client Users, interne Agency Roles und External Collaborators.
- Contracts, Statements of Work, Service Plans und Entitlements.
- Kunden-Onboarding, Data Migration, Testing und Go-Live.
- Client Approval Portal.
- SLA Definitions, Monitoring und Breach Handling.
- White-Label-Portale, Branding, E-Mails, Reports und Custom Domains.
- Usage Records, Credits, Overage Rules und Client Budgets.
- Subscription-, Seat-, Brand-, Account-, Agent-, Usage-, Revenue-Share- und Hybrid-Pricing.
- Billing Statements, Invoices, Payments und Agency Margin.
- Client Reports, Support Tickets und Satisfaction.
- Offboarding, Data Export, Retention und Zugriffsentzug.

## Verbindliche Gates

- Keine Cross-Client-Datenzugriffe oder Reports.
- Vertragsscope und Entitlements werden technisch durchgesetzt.
- Interne Kosten und externe Preise bleiben getrennt.
- Offboarding entzieht Nutzer-, Agenten-, Token-, Plugin- und Domainzugriffe.
- Client Kill Switch und Tenant-Isolation-Audit vorhanden.

---

# Phase 18 — Enterprise Scaling, Reliability & Global Operations

## Ziel

Hochverfügbarer, skalierbarer und regional betreibbarer Enterprise-Betrieb.

## Kernumfang

- Global Control Plane und regionale Data Planes.
- Tenant Placement und Data Residency Policies.
- Global Routing, API Gateway, Service Discovery und Load Balancing.
- PostgreSQL HA, PITR, Read Replicas, Connection Pooling und Sharding Foundation.
- Redis Cluster, Queue Clustering, Partitioning und Priority Classes.
- getrennte API-, Workflow-, Research-, Analytics-, Finance-, Plugin-, Media- und Render-Worker-Pools.
- Bulkheads, Circuit Breakers, Backpressure und Graceful Degradation.
- Reactive, Scheduled, Predictive und Reserved-Capacity Autoscaling.
- Service-, Database-, Queue-, Storage-, Provider- und Region-Failover.
- Backup, Restore Tests, Disaster Recovery, RTO und RPO.
- SLIs, SLOs, Error Budgets, Incident Command und Postmortems.
- Canary Releases, Feature Rollouts und Migration Governance.
- FinOps, Capacity Forecasting und Unit Economics.

## Verbindliche Gates

- Keine globale Rohdatenreplikation ohne Residency Policy.
- Backups gelten erst nach erfolgreichen Restore-Tests als belastbar.
- Tenant Write Leases verhindern Split Brain.
- Last-, Failover-, Restore- und DR-Tests bestanden.
- Region-, Service- und Tenant-Isolation nachgewiesen.

---

# Phase 19 — CarryOS Integration & Unified Business Operating System

## Ziel

UGC Affiliate OS als klar abgegrenztes, installierbares CarryOS-Modul integrieren.

## Kernumfang

- CarryOS Module Manifest und Module Registry.
- Unified Identity, Sessions und Service Identities.
- Unified Tenant Context und RBAC Namespace `ugc.*`.
- Shared Credential Vault ohne Secretkopien.
- Shared Event Bus mit versionierten Contracts und Schema Registry.
- Shared Workflow, Agent und Plugin Runtime.
- Shared Notifications, Audit, Feature Flags und Licensing.
- Shared Billing und Finance-Integration.
- hierarchische Knowledge- und Memory-Federation.
- Shared Observability, Incident Management und Enterprise Control Plane.
- klare Data Ownership zwischen CarryOS Core und UGC-Modul.
- API Gateway unter `/api/modules/ugc/*`.
- Compatibility Matrix und Module Health.
- schrittweise Adapter-, Platform-Service-, Runtime-, Billing- und Enterprise-Migration.
- Reconciliation und Rollback.

## Verbindliche Gates

- Keine direkten unkontrollierten Cross-Module-Datenbankzugriffe.
- Alle Cross-Module-Aufrufe besitzen Tenant Context, Permission und Audit.
- Event- und API-Verträge sind versioniert.
- Migration erfolgt tenantweise, nicht als Big Bang.
- UGC bleibt fachlich eigenständig und unabhängig testbar.

---

# Phase 20 — Autonomous Agency & Policy-Governed Business Operations

## Ziel

Kontrollierter Endzustand einer weitgehend autonomen Affiliate-Agentur innerhalb von CarryOS.

## Kernumfang

- Strategic Objectives, Autonomy Policies und Decision Rights.
- Autonomiestufen 0–4; Level 5 nur als stark kontrollierte Enterprise-Erweiterung.
- Autonomous Agency Control Plane und Executive Supervisor.
- Operational, Portfolio, Campaign, Resource und Workforce Planning.
- Opportunity Selection mit Score-, Risk-, Confidence-, Budget-, Brand- und Capacity-Gates.
- autonome Research-, Content-, Media-, Publishing-, Analytics-, Optimization- und Finance-Zyklen innerhalb der Policies.
- Controlled Scaling, Pause, Stop und Rollback.
- Risk, Compliance, Finance und Capacity Directors.
- Executive Approval Inbox und Decision Explanations.
- Conservative-, Base-, Growth-, Aggressive-, Risk-Reduction- und Cost-Optimized-Szenarien.
- Business Health und CEO/COO/CFO Cockpits.
- Daily Executive Brief, Weekly Review und Monthly Business Review.
- Safe Mode, mehrstufige Kill Switches, Autonomy Audit und Governance Reviews.

## Dauerhaft governancepflichtige Aktionen

- Verträge, Preise und Kundenkonditionen.
- Überweisungen, Bankverbindungen und Zahlungsbedingungen.
- Rechts- und Steuerentscheidungen.
- Adminrechte, Account-Eigentum und globale Policies.
- kritische Compliance Overrides.
- erhebliche Budgeterhöhungen.
- irreversible Löschungen und neue Datenregionen.

## Verbindliche Gates

- Keine Agenten-Selbstvermehrung, Rechte- oder Policy-Selbständerung.
- Jede bedeutende Entscheidung erklärt Ziel, Daten, Alternativen, Kosten, Risiko, Confidence, Policy und Rollback.
- Gewinner werden nur innerhalb von Guardrails skaliert.
- negative ROI-, Compliance-, Account-, Budget- oder Data-Quality-Signale können automatisch pausieren.
- Safe Mode und Kill Switches funktionieren auf System-, Tenant-, Client-, Brand-, Campaign-, Workflow-, Agent-, Account-, Provider-, Plugin-, Publishing-, Finance-, Learning- und Scaling-Ebene.
- End-to-End-, Security-, Compliance-, Finance-, Isolation-, Last-, Failover-, Restore- und DR-Gates bestanden.

---

# Phasenübergreifende Definition of Done

Eine Phase ist nicht allein durch vorhandene Dateien oder APIs abgeschlossen. Für jede Phase gelten mindestens folgende Abschlussbedingungen:

1. Datenmodelle, Enums und Zod-Schemas sind vollständig und versioniert.
2. Domain-, Application- und Infrastructure-Grenzen sind eingehalten.
3. APIs besitzen Auth, RBAC, Tenant Context, Validierung, Rate Limits und standardisierte Fehler.
4. Jobs sind idempotent, resumierbar, timeoutfähig und DLQ-gestützt.
5. Events sind versioniert und enthalten Event-ID, Tenant, Workspace, Correlation und Timestamp.
6. Secrets liegen ausschließlich im Vault und werden in Logs, Events und Prompts maskiert.
7. Kosten-, Risiko-, Compliance- und Approval-Grenzen werden technisch durchgesetzt.
8. Audit erfasst Nutzer-/Agentenidentität, Aktion, Scope, Entity, Vorher/Nachher und Correlation.
9. Observability umfasst Logs, Metrics, Traces, Business KPIs und Alerts.
10. Unit-, Integration-, Contract- und E2E-Tests sind grün.
11. `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm run build` und `pnpm run validate:deploy` sind grün.
12. API-, Architektur-, Security-, Operations- und Benutzer-Dokumentation ist aktualisiert.
13. Migrationen, Rollback, Backup und Datenretention sind dokumentiert und getestet.
14. Workspace-, Tenant-, Client-, Brand-, Account-, Agent-, Plugin- und Region-Isolation ist je nach Phase nachgewiesen.
15. Die Phase enthält keine Platzhalter, Mock-only-Pfade oder stillen TODOs in produktionskritischen Bereichen.

# Empfohlene Umsetzung

Jede Hauptphase wird in zehn Unterphasen umgesetzt:

1. Domain und Datenmodelle
2. SDKs und Contracts
3. Core Services
4. Adapter und Provider
5. APIs und UI
6. Events, Jobs und Workflows
7. RBAC, Audit und Governance
8. Observability und Operations
9. Tests, Security und Performance
10. Dokumentation, Migration und Abschluss-Gates

Die Umsetzung erfolgt strikt nacheinander. Folgephasen dürfen Foundations früherer Phasen nutzen, aber keine fehlenden Sicherheits-, Daten- oder Governance-Gates umgehen.
