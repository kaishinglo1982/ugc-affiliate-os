# UGC Affiliate OS / CarryOS Fashion Agency — Company OS Migration Roadmap

Stand: 8. September 2026
Status: VERBINDLICH GEPLANT — KEIN FULL REWRITE

## Ziel

Dieses Repository wird als CarryOS-Fachplugin für Fashion/UGC/Content-/Affiliate-Workflows weitergeführt. CarryOS bleibt Core; kanal-, creator-, campaign- und commerce-spezifische Fachlogik bleibt im Plugin.

## Migrationsblock

1. Plugin Contract v2 einführen.
2. Business Blueprint definieren: Marken, Zielgruppen, Nischen, Kanäle, Content-Regeln, UGC-Policies, KPIs, Budgets.
3. Departments: Research, Content, UGC/Media, Social Publishing, Affiliate/Commerce, Campaigns, Analytics, Communications.
4. Executive Conductor + Department Manager + Specialist Agents.
5. Agenten in Skills/SOPs zerlegen: Research, Briefing, Script, Editing, Repurposing, Publishing, Tracking, Reporting.
6. Autonomy Ladder L0-L5 pro Skill; Publishing, Spend und rechtlich relevante Claims mit Approval-Gates.
7. Business Objects: Brand, Persona/Audience, Product, Offer, Campaign, Content Asset, Video Asset, Post, Channel Account, Affiliate Link, Conversion, Commission, Task.
8. Company Graph und Agent/Skill Detail Drawer integrieren.
9. Truth Engine für Produktdaten, Claims, Quellen und Performance-Facts.
10. Knowledge Guardian für Brand Voice, Guidelines, veraltete Produkt-/Affiliate-Daten, Broken Links und SOP Drift.
11. Operational Dashboards für Content Pipeline, UGC Studio, Channels, Affiliate Performance, Costs und Agent Runs.
12. Self-shot/Repurpose bleibt Low-Cost-Primärpfad; Premium Video Provider nur über kontrollierte CarryOS Provider-/Connector-Abstraktion.
13. Fashion/UGC Process Templates für CarryOS Process & Automation Intelligence registrieren.
14. Legacy Adapter aktiv halten bis Funktionsparität erreicht ist.

## Process & Automation Intelligence — Fashion / UGC

Das Plugin liefert nur Domain-Templates, Business Objects, Skills, Workflows und Outcome-Metriken. Process Discovery, Automation Opportunity Scoring, ROI/Feasibility/Risk, Automation Plan Generation, Connector Resolution und Runtime bleiben im CarryOS Core.

### Priorisierte Process Templates

1. **Trend/Product Research -> Campaign Opportunity**
   - Inputs: freigegebene Produkt-, Markt-, Such- und Performance-Daten.
   - Automation: Signale sammeln, Quellen bewerten, Opportunity-Kandidaten erzeugen.
   - Escalation: geringe Datenqualität, widersprüchliche Claims, fehlende Quellen.

2. **Campaign -> Briefing -> Script**
   - Inputs: Brand, Audience, Product, Offer, Channel, Policy, Performance Learnings.
   - Automation: Briefing- und Script-Entwurf, Varianten, Compliance-/Brand-Checks.
   - Approval: markenprägende oder rechtlich relevante Claims.

3. **Asset/Video -> Review -> Publishing**
   - Inputs: Script, Asset, Channel Requirements, Brand Guidelines.
   - Automation: Format-/Metadatenprüfung, Repurposing, Publishing-Vorbereitung.
   - Approval: Publishing grundsätzlich policy-gebunden; kein ungeprüfter Auto-Publish außerhalb explizit freigegebener Autonomie.

4. **Publishing -> Attribution -> Analytics**
   - Inputs: Post, Channel Account, Affiliate Link, Campaign, Conversion/Commission Daten.
   - Automation: Attribution, Performance-Aggregation, Anomalieerkennung, Reporting.
   - Keine erfundenen Views, Conversions, Umsätze, Provisionen oder ROAS-Werte.

5. **Analytics -> Optimization -> Next Content**
   - Inputs: reale Performance, Kosten, Kommentare/Feedback, Conversion- und Commission-Daten.
   - Automation: Hypothesen, Varianten, Next-Best-Content-Vorschläge.
   - Evaluation vergleicht geplante gegen gemessene Outcomes.

6. **Affiliate Link / Offer Integrity**
   - Automation: Broken Links, abgelaufene Offers, falsche Produkt-/Claim-Zuordnungen und Tracking-Gaps erkennen.
   - Escalation: Datenkonflikt, fehlende Entitlements/Connectoren, rechtliche Unsicherheit.

### UGC Automation Opportunity Signale

- manuelle Research-/Briefing-/Editing-/Publishing-Zeit;
- Content-Durchlaufzeit;
- Repurpose-Anteil;
- Asset-Fehler-/Rework-Rate;
- reale Produktions-/Providerkosten;
- Publishing-/Approval-Anteil;
- Tracking-Abdeckung;
- Conversion-/Commission-Attribution nur bei belastbarer Datenbasis;
- reale AI-/Connector-/Runtime-Kosten.

### Automation Modes

- `ASSIST`: Research, Briefings, Scripts, Edit-/Repurpose-Vorschläge, Analytics.
- `APPROVAL`: Publishing, Spend, Brand/Legal Claims, Premium Provider Runs nach Policy.
- `AUTO`: risikoarme interne Klassifikation, Asset Checks, Metadaten, Reporting innerhalb Policy.
- `ESCALATE`: fehlende Quellen, Brand/Legal Konflikt, Tracking-Gap, fehlende Capability/Connectoren.

## CarryOS Core Nutzung

Auth/Tenant/RBAC, AI Gateway `OpenCode Go -> OmniRoute -> OpenCode Zen`, Shared Memory/RAG, Workflow Runtime, Audit, FinOps, Connector Framework, Process Registry/Discovery, Automation Opportunity/ROI/Feasibility/Risk, Automation Plan Generator, Approval, Kill Switch und zentrale Policies.

## Security / Release Gates

- TypeScript strict; kein `any` in neuem/geändertem Code.
- tenantgebundene Persistenz und serverseitige Tenant-Auflösung.
- AES-256-GCM für Tokens/Secrets.
- PII-Filter vor externem Egress.
- keine Secrets im Frontend.
- keine externen Image-URLs als produktive UI-Abhängigkeit; Assets kontrolliert über eigene Storage-/Asset-Pipeline.
- keine Mockdaten/Fake-Erfolge/toten Buttons produktiv.
- Audit, Budget, Approval, Retry, Idempotenz, DLQ und Rollback.
- Process-/ROI-Scores nur mit realer Baseline, Confidence und Quellenbezug.
- fehlende Connectoren, Entitlements oder Tracking-Daten blockieren entsprechende Automationen oder Kennzahlen fail-closed.
- Sentinel v3 / Port 3000 unberührt.

## Migration statt Rewrite

`Legacy UGC/Fashion -> Compatibility Adapter -> Plugin Contract v2 -> Departments -> Skills/SOPs -> Business Objects -> Process Templates -> Autonomy/Policies -> Company Graph -> CarryOS Automation Intelligence -> Go-Live Gate`
