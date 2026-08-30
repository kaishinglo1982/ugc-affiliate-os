# UGC / Fashion Agent Ownership Matrix

Status: ACTIVE RECONCILIATION
Branch: `reconcile/no-duplicate-agents`

## Ziel

UGC/Fashion nutzt gemeinsame CarryOS-Agenten für generische Arbeit. Das Plugin besitzt nur Affiliate-, Fashion-, Commerce- und UGC-spezifische Skills/Policies/Tools oder echte Domain-Spezialisten.

## Verbindliche Regeln

1. Keine eigenen generischen Research-, Content-, Social-, Campaign-, Analytics-, CRM-, Communications-, Workflow- oder Approval-Agenten.
2. Generische Fähigkeiten werden über CarryOS Workforce / CarryOS Ads referenziert.
3. Fachlogik wird als `fashion.*`, `ugc.*` oder `affiliate.*` Skill geführt.
4. Kein eigener generischer Agent Runtime-, Memory-, Model-Routing-, FinOps-, Audit- oder Governance-Stack.
5. Bestehende Agenten werden vor Entfernung in Capability + Domain Skill zerlegt.

## Ownership

| Verantwortlichkeit | Owner |
|---|---|
| Research / Web Research | CarryOS Core |
| Content Writing / Copy | CarryOS Core |
| Social Publishing | CarryOS Core |
| Generic Image/Video Orchestration | CarryOS Core |
| Paid Advertising | CarryOS Ads |
| Campaign Analytics / Attribution | CarryOS Ads / Core Analytics |
| Workflow Orchestration | CarryOS Core |
| Approval / Compliance Runtime | CarryOS Core |
| Affiliate Product Discovery Logic | UGC/Fashion Plugin |
| Affiliate Offer Ranking | UGC/Fashion Plugin |
| Fashion Trend Interpretation | UGC/Fashion Plugin |
| UGC Hook / Script Domain Logic | UGC/Fashion Plugin |
| Ghost Brand Strategy | UGC/Fashion Plugin |
| Affiliate Network Domain Logic | UGC/Fashion Plugin |
| Affiliate Margin / Commission Logic | UGC/Fashion Plugin |

## Erlaubte Domain Specialists

- Affiliate Product Scout
- Affiliate Offer Evaluator
- Fashion Trend Specialist
- UGC Hook Specialist
- Ghost Brand Specialist
- Affiliate Network Specialist
- Affiliate Conversion / Margin Specialist

## Zielbild

```text
CarryOS Research / Content / Social / Analytics / Workflow
CarryOS Ads Campaign / Media Buying / Attribution
                 |
                 +-- UGC/Fashion Domain Skills
                       affiliate.product-discovery
                       affiliate.offer-ranking
                       affiliate.margin
                       fashion.trend-interpretation
                       ugc.hook-generation
                       ugc.product-to-content
                       ghost-brand.strategy
```

## Removal Gate

Keine bestehende Implementierung ersatzlos löschen. Erst Call-Sites inventarisieren, Domain-Logik extrahieren, CarryOS Contract/Adapter festlegen und Tests/Build prüfen.
