# UGC Affiliate OS — CarryOS Company OS Migration Roadmap

Stand: 8. September 2026
Status: VERBINDLICH GEPLANT — KEIN FULL REWRITE

## Source of Truth

`kaishinglo1982/ugc-affiliate-os` ist das **einzige autoritative UGC-/Affiliate-Hauptprojekt**.

Es ist **kein Fashion-Projekt**. Fashion ist höchstens eine optionale Nische bzw. ein Content-/Produktsegment innerhalb eines generischen UGC-/Affiliate-Systems. Bezeichnungen wie `Fashion/UGC`, `Fashion Agency` oder `CarryOS Fashion Agency` sind für dieses Projekt nicht mehr zulässig.

Parallele oder frühere UGC-Repositories sind keine aktiven Zielprojekte und dürfen keine konkurrierenden Roadmaps, Runtimes, Agenten-Cores oder Plugin-Sources-of-Truth definieren.

## Ziel

UGC Affiliate OS wird als CarryOS-Fachplugin für **UGC, Content, Affiliate Commerce, Social Publishing und Performance Optimization** weitergeführt. CarryOS bleibt Core; creator-, campaign-, product-, offer-, affiliate- und commerce-spezifische Fachlogik bleibt im Plugin.

Das System muss nischenunabhängig funktionieren, z. B. Beauty, Home, Tech, Fitness, Pets, Lifestyle, Fashion oder andere Affiliate-Segmente, ohne die Architektur auf eine einzelne Branche festzulegen.

## Migrationsblock

1. Plugin Contract v2 einführen.
2. Business Blueprint definieren: Brands/Properties, Zielgruppen, Nischen, Kanäle, Content-Regeln, UGC-Policies, Affiliate-Regeln, KPIs und Budgets.
3. Departments: Research, Content, UGC/Media, Social Publishing, Affiliate/Commerce, Campaigns, Analytics, Communications.
4. Executive Conductor + Department Manager + Specialist Agents.
5. Agenten in Skills/SOPs zerlegen: Research, Product Scoring, Offer Selection, Briefing, Script, Editing, Repurposing, Publishing, Tracking, Reporting und Optimization.
6. Autonomy Ladder L0-L5 pro Skill; Publishing, Spend, Account Changes und rechtlich relevante Claims mit Approval-Gates.
7. Business Objects: Brand/Property, Persona/Audience, Product, Merchant, Affiliate Network, Offer, Campaign, Content Asset, Video Asset, Post, Channel Account, Affiliate Link, Conversion, Commission, Payout, Task.
8. Company Graph und Agent/Skill Detail Drawer integrieren.
9. Truth Engine für Produktdaten, Offers, Claims, Affiliate-Regeln, Quellen und Performance-Facts.
10. Knowledge Guardian für Guidelines, veraltete Produkt-/Affiliate-Daten, Broken Links, abgelaufene Offers und SOP Drift.
11. Operational Dashboards für Product/Offer Pipeline, Content Pipeline, UGC Studio, Channels, Affiliate Performance, Revenue/Commission, Costs und Agent Runs.
12. Self-shot/Repurpose bleibt Low-Cost-Primärpfad; Premium Video Provider nur über kontrollierte CarryOS Provider-/Connector-Abstraktion.
13. UGC/Affiliate Process Templates für CarryOS Process & Automation Intelligence registrieren.
14. Legacy Adapter nur für tatsächlich benötigte Funktionen aktiv halten, bis Funktionsparität im Hauptprojekt erreicht ist; kein paralleler Weiterbau alter UGC-Projekte.

## Process & Automation Intelligence — UGC Affiliate OS

Das Plugin liefert nur Domain-Templates, Business Objects, Skills, Workflows, Outcome-Metriken und Compliance-Regeln. Process Discovery, Automation Opportunity Scoring, ROI/Feasibility/Risk, Automation Plan Generation, Connector Resolution und Runtime bleiben im CarryOS Core.

### Priorisierte Process Templates

1. **Product/Offer Research -> Affiliate Opportunity**
   - Inputs: freigegebene Produkt-, Merchant-, Affiliate-Network-, Markt-, Such- und Performance-Daten.
   - Automation: Produkte/Offers sammeln, Provision, Preis, Nachfrage, Content-Fit, Wettbewerb und Datenqualität bewerten.
   - Output: Opportunity Candidates mit Quellen, Confidence und Blocking Gaps.
   - Escalation: widersprüchliche Produktdaten, fehlende Affiliate-Bedingungen, unsichere Claims oder fehlende Quellen.

2. **Opportunity -> Campaign -> Briefing -> Script**
   - Inputs: Audience, Product, Offer, Merchant, Channel, Policy, Performance Learnings.
   - Automation: Campaign-Konzept, Briefing, Hook-/Script-Varianten, CTA und Compliance-/Claim-Checks.
   - Approval: markenprägende, rechtliche oder merchant-/network-sensitive Claims.

3. **Asset/Video -> Review -> Publishing**
   - Inputs: Script, Asset, Channel Requirements, Content Policies.
   - Automation: Format-/Metadatenprüfung, Repurposing, Affiliate-Link-Zuordnung, Publishing-Vorbereitung.
   - Approval: Publishing policy-gebunden; kein ungeprüfter Auto-Publish außerhalb explizit freigegebener Autonomie.

4. **Publishing -> Affiliate Attribution -> Analytics**
   - Inputs: Post, Channel Account, Affiliate Link, Campaign, Click, Conversion, Commission und Payout-Daten.
   - Automation: Attribution, Performance-Aggregation, Anomalieerkennung und Reporting.
   - Keine erfundenen Views, Clicks, Conversions, Umsätze, Provisionen, Payouts oder ROAS-Werte.

5. **Analytics -> Optimization -> Next Content / Offer**
   - Inputs: reale Performance, Kosten, Kommentare/Feedback, Conversion-, Commission- und Payout-Daten.
   - Automation: Hypothesen, Creative-Varianten, Next-Best-Content-, Product- und Offer-Vorschläge.
   - Evaluation vergleicht geplante gegen gemessene Outcomes.

6. **Affiliate Link / Offer Integrity**
   - Automation: Broken Links, abgelaufene Offers, falsche Merchant-/Product-/Claim-Zuordnungen, Tracking-Gaps und geänderte Programmbedingungen erkennen.
   - Escalation: Datenkonflikt, fehlende Entitlements/Connectoren, geänderte Affiliate-Regeln oder rechtliche Unsicherheit.

7. **Multi-Brand / Multi-Account Operations**
   - Automation: gemeinsame Workflows mit getrenntem Brand-/Account-/Credential-/Knowledge-Kontext ausführen.
   - Keine Agent-/Workflow-Kopien pro Brand, wenn derselbe versionierte Skill/Workflow mit anderem Kontext verwendet werden kann.
   - Tenant-, Brand-, Account- und Credential-Isolation bleiben fail-closed.

### UGC/Affiliate Automation Opportunity Signale

- manuelle Research-/Product-Scoring-/Briefing-/Editing-/Publishing-Zeit;
- Content-Durchlaufzeit;
- Repurpose-Anteil;
- Asset-Fehler-/Rework-Rate;
- reale Produktions-/Providerkosten;
- Publishing-/Approval-Anteil;
- Affiliate-Link-/Tracking-Abdeckung;
- Offer-Verfügbarkeit und Datenaktualität;
- Click-/Conversion-/Commission-/Payout-Attribution nur bei belastbarer Datenbasis;
- reale AI-/Connector-/Runtime-Kosten.

### Automation Modes

- `ASSIST`: Research, Product/Offer Scoring, Briefings, Scripts, Edit-/Repurpose-Vorschläge, Analytics und Optimization.
- `APPROVAL`: Publishing, Spend, rechtlich relevante Claims, Premium Provider Runs, Account-/Campaign-Änderungen nach Policy.
- `AUTO`: risikoarme interne Klassifikation, Asset Checks, Metadaten, Link Integrity, Reporting und erlaubte Daten-Synchronisation.
- `ESCALATE`: fehlende Quellen, Claim-/Policy-Konflikt, Tracking-Gap, geänderte Affiliate-Bedingungen, fehlende Capability/Connectoren.

## CarryOS Core Nutzung

Auth/Tenant/RBAC, AI Gateway `OpenCode Go -> OmniRoute -> OpenCode Zen`, Shared Memory/RAG, Workflow Runtime, Audit, FinOps, Connector Framework, Process Registry/Discovery, Automation Opportunity/ROI/Feasibility/Risk, Automation Plan Generator, Approval, Kill Switch und zentrale Policies.

## Security / Release Gates

- TypeScript strict; kein `any` in neuem/geändertem Code.
- tenantgebundene Persistenz und serverseitige Tenant-Auflösung.
- Brand-/Account-/Merchant-/Affiliate-Network-Zugriffe zusätzlich kontextgebunden.
- AES-256-GCM für Tokens/Secrets.
- PII-Filter vor externem Egress.
- keine Secrets im Frontend.
- keine externen Image-URLs als produktive UI-Abhängigkeit; Assets kontrolliert über eigene Storage-/Asset-Pipeline.
- keine Mockdaten/Fake-Erfolge/toten Buttons produktiv.
- Audit, Budget, Approval, Retry, Idempotenz, DLQ und Rollback.
- Process-/ROI-Scores nur mit realer Baseline, Confidence und Quellenbezug.
- fehlende Connectoren, Entitlements oder Tracking-Daten blockieren entsprechende Automationen oder Kennzahlen fail-closed.
- Affiliate- und Revenue-Kennzahlen müssen auf realen Network-/Merchant-/Tracking-Daten beruhen.
- Sentinel v3 / Port 3000 unberührt.

## Migration statt Rewrite

`UGC Affiliate OS -> Plugin Contract v2 -> Departments -> Skills/SOPs -> Business Objects -> Process Templates -> Autonomy/Policies -> Company Graph -> CarryOS Automation Intelligence -> Go-Live Gate`
