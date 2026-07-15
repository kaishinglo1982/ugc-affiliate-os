# CarryOS Universe – Band 70
# Masterprompt: Ecosystem Management (VOLLSTÄNDIG)

> Band: 70 | Masterprompt: 70.0 | Status: PLANNED | Gruppe: Platform
> Abhängigkeit: Band 10–16 (Core), Band 61–69 (Platform), keine Core-Fork

## Kapitel 1 – Architektur

- Ecosystem Management ist der übergreifende Governance-Layer, der Plugins (61), Marketplace (62), Packs (63–65), Licensing (66), API-Marketplace (67), Integrationen (68) und Ops (69) als kohärentes Partner-Ökosystem steuert – ein Orchestrierungs-Meta-Layer über Band 16 Industry Solution Factory.
- Ecosystem definiert Partner-Tiers, Revenue-Share, Compliance-Zertifizierung und Cross-Pack-Abhängigkeiten; alle Mutationen laufen durch Band 10 API-Standard.
- Keine eigene Engine: Ecosystem nutzt Band 11 Agenten, Band 9 Workflows und Band 14 Finance für Settlement.
- Partner-Isolation: Partner-Daten tenant-übergreifend (Platform-Sicht), aber Endkunden-Installationen strikt tenantIsoliert.

## Kapitel 2 – Datenmodelle

- `EcosystemPartner`: partnerId, tier (COMMUNITY|VERIFIED|STRATEGIC), orgTenantId, certified, revenueShare%.
- `EcosystemAsset`: assetId, type (PLUGIN|WORKFLOW_PACK|AGENT_PACK|KNOWLEDGE_PACK|API_PRODUCT|INTEGRATION), refId, partnerId.
- `EcosystemCertification`: assetId, status, findings[], certifiedBy, certifiedAt.
- `EcosystemSettlement`: period, partnerId, gross, share, settledVia (Band 14), status.

## Kapitel 3 – APIs

- `GET /api/v1/ecosystem/partners` – Partner-Verzeichnis (Platform-Sicht, Band-10-Envelope).
- `POST /api/v1/ecosystem/partners/:id/certify` – Asset-Zertifizierung (Platform-Admin).
- `GET /api/v1/ecosystem/assets` – alle Ökosystem-Assets quer über Bänder 61–68.
- `GET /api/v1/ecosystem/settlements` – Revenue-Share-Reports pro Partner.

## Kapitel 4 – Events

- `ecosystem.partner_onboarded.v1`, `ecosystem.asset_certified.v1`, `ecosystem.cross_dependency.v1`, `ecosystem.settled.v1`.
- Asset-Events aggregieren aus Bändern 61–68; Settlement emittiert `finance.payout.v1` an Band 14.
- Alle Events mit `partnerId`, `assetId`, `actorId`; schema-versioniert.

## Kapitel 5 – Workflows

- Onboard-Flow: Partner-Register → Tier-Assign → Compliance-Check → ExecutionKey → ACTIVE.
- Certify-Flow: Asset aus 61–68 → `CertificationAgent` (Band 11) → findings → CERTIFIED/REJECTED → Listing-Freigabe.
- Settlement-Flow: Period-End → Aggregation aus Bändern 62/67 → Revenue-Share → Band 14 Payout → `ecosystem.settled.v1`.

## Kapitel 6 – Agenten

- `EcosystemCertificationAgent` (Band 11): zertifiziert Assets über alle Bänder 61–68 gegen Sicherheits/Qualitätskriterien.
- `PartnerSuccessAgent`: monitoriert Partner-Health, Revenue-Trends, Compliance-Drift.
- `DependencyGraphAgent`: erkennt Cross-Pack-Zyklen/Konflikte im Ökosystem.

## Kapitel 7 – UI

- Ecosystem-Console: Partner-Map, Tier-Verteilung, Asset-Inventar über alle Bänder.
- Certification-Desk: Asset-Review, Findings, Certify/Reject-Workflow.
- Settlement-Report: Revenue-Share-Tabelle, Band-14-Payout-Links, Period-History.

## Kapitel 8 – Tests

- Vitest-Unit: Revenue-Share-Berechnung, Tier-Resolution, Cross-Dependency-Cycle-Detect, Cert-Status-Machine.
- Integration: Onboard→Certify→Settle Roundtrip; Partner A Assets nicht in Partner B Settlement.
- Security-Test: uncertified Asset im Marketplace → Blockiert durch CertificationAgent.

## Kapitel 9 – Security

- Platform-Admin-Permission für Certify/Settlement; Partner-Sicht strikt auf eigene Assets begrenzt.
- Alle Asset-Mutationen auditiert (Band 76); keine Secrets in Partner-Configs.
- Cross-Pack-Dependencies capability-geprüft via Band 10 Allowlist.

## Kapitel 10 – Performance

- Asset-Inventar-Aggregation p95 < 800ms über gecachte Cross-Band-Indizes; Certify < 300ms (async Agent).
- Settlement-Batch asynchron (Outbox); Indizes auf (partnerId, assetId), (period, partnerId).
- Partner-Console liest Read-Replicas, kein Locking im Request-Pfad.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines/Runtime.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
