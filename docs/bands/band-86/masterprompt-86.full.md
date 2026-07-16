# CarryOS Universe – Band 86
# Masterprompt: Dashboards (VOLLSTÄNDIG)

> Band: 86 | Masterprompt: 86.0 | Status: PLANNED | Gruppe: Analytics
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Erweitert `src/lib/analytics`. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Bestehende Systeme werden erweitert, nicht dupliziert. Keine zweite Runtime/Engine/Queue/Finance.

- Dashboard-Layout-Engine in `src/lib/analytics/dashboards.ts`: deklarative Widget-Konfigurationen (chart type, data source ref, filters) über bestehende Cubes/KPIs (Band 81–82); keine eigene Chart-Runtime, Nutzung bestehender UI-Komponenten.
- Widget-Data-Resolver: mappt Widget-Config auf `/api/v1/bi/*` und `/api/v1/kpi/*` Endpunkte; tenantId als Scope.
- Realtime-Subscriptions über bestehenden Event-Bus (kein eigener WS-Server); Updates via `*.computed.v1` Events.
- Dashboard-State tenant-/workspace-isoliert; Layout-Versionierung für Auditierbarkeit.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `Dashboard`: tenantId, workspaceId?, name, layoutJson (Zod-validiert), version, isDefault.
- `DashboardWidget`: tenantId, dashboardId, type, dataSourceRef (cubeId/kpiId), configJson, position.
- `DashboardShare`: tenantId, dashboardId, roleScope, grantedPermission, sharedAt.
- Dashboards referenzieren ausschließlich existierende Datenquellen; keine eigenen Rohdaten.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `GET /api/v1/dashboards` – Liste Dashboards des Tenants inkl. Widget-Metadaten.
- `POST /api/v1/dashboards` – Zod `DashboardSchema` (layoutJson validiert); idempotent via ExecutionKey.
- `PATCH /api/v1/dashboards/:id/widgets` – Widget hinzufügen/ändern; `requireApiPermission("dashboard:configure")`.
- `GET /api/v1/dashboards/:id/state` – aggreggierte Widget-Daten-Refs als Envelope (keine Rohwerte im Layout).

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `dashboard.created.v1` / `dashboard.updated.v1` / `dashboard.deleted.v1` – Lifecycle.
- `dashboard.widget.added.v1` / `dashboard.widget.removed.v1` – Widget-Änderungen.
- `dashboard.shared.v1` – bei Freigabe; payload: tenantId, dashboardId, roleScope.
- Widget-Refresh abonniert `kpi.snapshot.computed.v1` / `bi.cube.materialized.v1`.

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Dashboard-Flow: withApiContext → Zod-Validate → requireApiPermission("dashboard:configure") → Persist (version++) → Event → Envelope.
- Widget-Flow: Validate (dataSourceRef muss existieren) → Upsert → Layout-Reindex → `dashboard.widget.added.v1`.
- Share-Flow: Validate → `DashboardShare` Upsert → `dashboard.shared.v1`; idempotent via ExecutionKey.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `dashboard-composer` Agent: schlägt Widget-Layout aus aktiven KPIs vor; in Band 11 Runtime, tenantScoped.
- `dashboard-watcher` Agent: meldet anomale Widget-Werte pro Dashboard natürlichsprachig.
- Keine eigene Agent-Runtime; vollständig tenantScoped.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- `DashboardGrid`: rendert Widgets aus `Dashboard` Layout; reine Präsentation.
- `WidgetRenderer`: je Typ (line/bar/gauge) ruft zugehörige `/api/v1/bi|kpi` Endpoint auf.
- `DashboardEditor`: Drag&Drop-Layout, serialisiert zu `DashboardSchema` (layoutJson).
- Keine Aggregationslogik im Client; alle Werte serverseitig aus Cubes/KPIs.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: `dashboards.test.ts` – Layout-Validierung, Widget-Position-Index, Version-Increment.
- Unit: `dashboardSchema.test.ts` – Ablehnung ungültiger dataSourceRef, fehlerhafter layoutJson.
- Integration: state-Endpoint mit zwei Tenants; Assert Dashboard-Trennung.
- Security-Test: `dashboard:configure` blockiert ohne Permission; Cross-Tenant-Share verweigert.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Dashboards/Widgets zwingend tenantId-gefiltert; Repository verweigert query ohne tenantScope.
- `requireApiPermission("dashboard:read" | "dashboard:configure" | "dashboard:share")`.
- Share-Scope nie über Tenant-Grenze; Workspace-Isolation durchgehend erzwungen.
- Keine Secrets im Layout/Config; nur Referenzen auf Datenquellen.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Composite-Index `(tenantId, dashboardId, version)` auf `Dashboard`/`DashboardWidget`.
- Widget-Daten via parallele, gecachte Endpunkt-Aufrufe; p95 Dashboard-Laden < 1 s.
- Layout-JSON gecached; Invalidierung bei Version-Change.
- Realtime-Updates über Event-Bus statt Polling; batched Widget-Refresh.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
