# UGC Affiliate OS / CarryOS Fashion Agency — Company OS Migration Roadmap

Stand: 29. August 2026
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
13. Legacy Adapter aktiv halten bis Funktionsparität erreicht ist.

## CarryOS Core Nutzung

Auth/Tenant/RBAC, AI Gateway `OpenCode Go -> OmniRoute -> OpenCode Zen`, Shared Memory/RAG, Workflow Runtime, Audit, FinOps, Connector Framework, Approval, Kill Switch und zentrale Policies.

## Security / Release Gates

- TypeScript strict; kein `any` in neuem/geändertem Code.
- tenantgebundene Persistenz und serverseitige Tenant-Auflösung.
- AES-256-GCM für Tokens/Secrets.
- PII-Filter vor externem Egress.
- keine Secrets im Frontend.
- keine externen Image-URLs als produktive UI-Abhängigkeit; Assets kontrolliert über eigene Storage-/Asset-Pipeline.
- keine Mockdaten/Fake-Erfolge/toten Buttons produktiv.
- Audit, Budget, Approval, Retry, Idempotenz, DLQ und Rollback.
- Sentinel v3 / Port 3000 unberührt.

## Migration statt Rewrite

`Legacy UGC/Fashion -> Compatibility Adapter -> Plugin Contract v2 -> Departments -> Skills/SOPs -> Business Objects -> Autonomy/Policies -> Company Graph -> Go-Live Gate`
