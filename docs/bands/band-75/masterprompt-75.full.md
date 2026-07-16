# CarryOS Universe – Band 75
# Masterprompt: ISO 27001 (VOLLSTÄNDIG)

> Band: 75 | Masterprompt: 75.0 | Status: PLANNED | Gruppe: Enterprise
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

## Kapitel 1 – Architektur

Beschreibt die ISO-27001-Schichten. Erweitert Compliance (73) und Security (71).

- Thema: ISMS (Information Security Management System) als Struktur über Controls der Annex A.
- Control-Catalog in `src/lib/isms/catalog.ts` (ISO 27001:2022 Annex A), tenant-aware Overlay.
- Risk-Assessment-Engine in `src/lib/isms/risk.ts`: Likelihood×Impact → Treatment-Plan.
- Verknüpfung mit Compliance-Engine (73) und Audit (`src/lib/audit`) für Nachweisbarkeit.
- Kein zweites Management-System: ISMS nutzt bestehende ControlEvaluation-Tabellen.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `IsmsControl`: tenantId, annexCode, title, status, owner.
- `RiskAsset`: tenantId, name, category, confidentiality, integrity, availability.
- `RiskAssessment`: tenantId, assetId, threat, likelihood, impact, riskScore, treatment.
- `StatementOfApplicability`: tenantId, controlId, applicable, justification, generatedAt.
- Alle Tabellen tenant-isoliert via `tenant.ts`; Referenz auf `ControlObjective` aus Band 73.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `GET /api/v1/isms/controls` – Annex-A-Controls mit Status.
- `POST /api/v1/isms/risk-assessments` – Risikobewertung anlegen (Zod `RiskInput`).
- `GET /api/v1/isms/soa` – Statement of Applicability abrufen.
- `POST /api/v1/isms/treatments` – Maßnahmen/Risikobehandlung erfassen.
- Endpunkte nutzen `withApiContext` + `requireApiPermission('isms.admin')`.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `isms.control.updated.v1` – Control-Status geändert.
- `isms.risk.assessed.v1` – neue/aktualisierte Risikobewertung.
- `isms.soa.generated.v1` – SoA erzeugt (Zertifizierungsrelevant).
- `isms.nonconformity.raised.v1` – Abweichung/NC festgestellt.
- Consumer: Audit Center (76), Compliance (73), Observability (78).

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Risk-Assessment: Erfassung → `risk.ts` Score → Treatment-Vorschlag → Event.
- SoA-Generation: alle Controls → Applicable-Filter → Dokument → Signierung.
- NC-Management: Feststellung → Root-Cause → Corrective-Action → Verifikation → Close.
- Management-Review: periodische Aggregation aller Controls/Risks → Report.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `isms-auditor` Agent: prüft Control-Effektivität, erkennt NC-Trends.
- `risk-analyst` Agent: korreliert Threat-Events (71) mit Assets/Risks.
- Registrierung in Band-11-Runtime; kein eigener Loop.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- `src/app/app/isms` ISMS-Cockpit: Annex-A-Matrix, Risk-Register, SoA-Viewer.
- Risk-Heatmap-Komponente; NC-Tracker mit Workflow-State.
- Keine Risiko-Score-Logik im Client; serverseitig via `risk.ts`.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: `catalog.ts` Mapping, `risk.ts` Score-Formel, SoA-Filterlogik.
- Integration: Risk-Assessment → Treatment → SoA-Konsistenz.
- Security-Test: Cross-Tenant ISMS-Daten nicht zugreifbar.
- Negative: inapplicable Control ohne Justification wird abgelehnt.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- AuthN über Session-System; AuthZ via `rbac.ts` mit `isms.*`-Permissions.
- Tenant-Isolation via `tenant.ts` bei allen ISMS-Queries.
- SoA/Risk-Dokumente vertraulich; keine Secrets in Beschreibungsfeldern.
- NC-Evidenz manipulationssicher (Audit-gebunden).

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `IsmsControl(tenantId, annexCode)`, `RiskAssessment(tenantId, assetId)`.
- Catalog-Cache je Tenant (TTL 600s); p95 Risk-Score < 50ms.
- SoA-Generierung asynchron (Queue); Report-Rendering gecached.
- NC-Dashboard aggregiert via Read-Model, nicht Live-Joins.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Security-Test: Cross-Tenant-ISMS-Block bestanden.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
