# CarryOS Universe – Band 80
# Masterprompt: Global Deployment (VOLLSTÄNDIG)

> Band: 80 | Masterprompt: 80.0 | Status: PLANNED | Gruppe: Enterprise
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

## Kapitel 1 – Architektur

Beschreibt die Global-Deployment-Schichten. Erweitert bestehende Module statt Neuaufbau.

- Thema: Multi-Region-Bereitstellung, Geolocation-Routing und Datenresidenz pro Tenant.
- Deployment-Controller in `src/lib/deploy/controller.ts`; nutzt bestehende Edge/Region-Topologie.
- Integration: DR (79) für Regions-Failover, IAM (72) für regionale Zugriffsregeln.
- Datenresidenz: Tenant → Region-Pinning; EU-Daten verlassen konfigurierte Region nicht.
- Keine zweite Deployment-Pipeline: nutzt bestehende Release/CI-Topologie des Monorepos.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `Region`: code (eu/de/fra/us), provider, status, latencyMs, active.
- `TenantRegionBinding`: tenantId, regionCode, dataResidency, pinnedAt.
- `Deployment`: tenantId, regionCode, version, status (rolling/done/failed), deployedAt.
- `EdgeRoute`: tenantId, pattern, regionCode, weight (Traffic-Shaping).
- Tabellen tenant-isoliert via `tenant.ts`; Bindings erzwingen Residenz-Routing.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `GET /api/v1/deploy/regions` – aktive Regionen + Status.
- `POST /api/v1/deploy/bindings` – Tenant-Region-Binding setzen (Zod `BindingInput`, Permission `deploy.admin`).
- `POST /api/v1/deploy/rollouts` – Rolling-Deploy triggern (idempotent via ExecutionKey).
- `GET /api/v1/deploy/status/:id` – Rollout-Fortschritt je Region.
- Endpunkte nutzen `withApiContext`; kritische Ops nur mit `deploy.admin`.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `deploy.region.registered.v1` – neue Region aktiv.
- `deploy.binding.changed.v1` – Tenant-Region-Binding aktualisiert (Residenz-Relevant).
- `deploy.rollout.started.v1` / `deploy.rollout.completed.v1` – Deployment-Lifecycle.
- `deploy.traffic.shifted.v1` – EdgeRoute-Gewichtung geändert.
- Consumer: DR (79), Monitoring (77), Audit (76).

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Binding: Antrag → Residenz-Check → `TenantRegionBinding` → Routing-Update → Event.
- Rollout: Version → Region-Sequenz (canary) → `Deployment` pro Region → Health-Gate → Next.
- Traffic-Shift: EdgeRoute-Weight anpassen → `deploy.traffic.shifted.v1` → Monitor (77).
- Region-Removal: Drain → Rebind betroffene Tenants → DR-Failover (79) bei Bedarf.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `deploy-orchestrator` Agent: steuert Canary-Rollouts, auto-rollback bei Health-Degradation.
- `residency-guard` Agent: prüft Datenresidenz-Verletzungen über Regionsgrenzen.
- Registrierung in Band-11-Runtime; kein eigener Loop.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- `src/app/app/deploy` Konsole: Regions-Map, Rollout-Board, Tenant-Bindings, Traffic-Shaping.
- Rollout-Steuerung (Server-Action → API) mit Canary-Pause/Resume.
- Keine Deploy-Logik im Client; serverseitig über `controller.ts`.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: `controller.ts` Region-Sequenz, Residenz-Validierung, Traffic-Weight-Berechnung.
- Integration: Binding → Routing liefert korrekte Region; Rollout durchläuft Canary.
- Security-Test: Cross-Tenant Binding nicht manipulierbar; Residenz-Verletzung blockiert.
- Negative: Rollout stoppt bei Health-Gate-Fail; ungültige Region wird abgelehnt.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- AuthN über Session-System; AuthZ via `rbac.ts` mit `deploy.*`-Permissions.
- Tenant-Isolation via `tenant.ts`; Datenresidenz hart erzwungen (kein Cross-Region-Read).
- Region-Credentials/Secrets im Vault; niemals in Deploy-Configs/Logs.
- Binding-Änderungen manipulationssicher (Audit 76), da Compliance-relevant (DSGVO 74).

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `TenantRegionBinding(tenantId, regionCode)`, `Deployment(tenantId, regionCode, deployedAt)`.
- Rollout asynchron (Queue); p95 Routing-Resolution < 5ms am Edge.
- Region-Status gecached (TTL 30s); Traffic-Shift propagiert < 60s global.
- Health-Gate nutzt Observability (78) Metriken, kein Polling-im-Path.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines/Pipelines.
7. Security-Test: Cross-Tenant-Binding-Block + Datenresidenz-Erzwingung bestanden.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
