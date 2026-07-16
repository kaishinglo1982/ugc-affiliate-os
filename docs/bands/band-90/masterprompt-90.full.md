# CarryOS Universe – Band 90
# Masterprompt: Executive Cockpit (VOLLSTÄNDIG)

> Band: 90 | Masterprompt: 90.0 | Status: PLANNED | Gruppe: Analytics
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Erweitert `src/lib/analytics`. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Bestehende Systeme werden erweitert, nicht dupliziert. Keine zweite Runtime/Engine/Queue/Finance.

- Cockpit-Composition in `src/lib/analytics/cockpit.ts`: aggregiert KPIs (82), Forecasts (84), Benchmarks (87) und Dashboards (86) zu einer Führungs-Sicht; keine eigene Engine, orchestriert bestehende Services.
- Executive-View-Resolver: mappt Rollen/Profil auf vordefinierte Widget-Sets; tenantId + Rolle als Scope.
- NL-Briefing-Service: nutzt Free-First LLM-Provider (über `src/lib/analytics/provider`) für natürlichsprachliches Executive-Summary; Premium nur nach Freigabe.
- Alle Zahlen stammen aus versionierten Quellen (Band 81–87); Cockpit fügt keine eigene Fachlogik hinzu.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `CockpitView`: tenantId, name, roleScope, layoutJson (Zod-validiert), version, isDefault.
- `CockpitWidget`: tenantId, viewId, sourceRef (kpiId/forecastId/benchmarkId/dashboardId), configJson.
- `CockpitBriefing`: tenantId, viewId, periodStart, periodEnd, summaryRef, generatedAt.
- Cockpit referenziert ausschließlich existierende Analytics-Objekte; keine Rohdaten-Duplikate.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `GET /api/v1/cockpit/views` – Liste Cockpit-Views des Tenants nach Rolle.
- `POST /api/v1/cockpit/views` – Zod `CockpitViewSchema` (layoutJson validiert); idempotent via ExecutionKey.
- `POST /api/v1/cockpit/briefing` – `BriefingRequestSchema` (viewId, period); `requireApiPermission("cockpit:read")`.
- `GET /api/v1/cockpit/views/:id/state` – aggregierte Widget-Daten-Refs als Envelope (keine Rohwerte).

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `cockpit.view.created.v1` / `cockpit.view.updated.v1` / `cockpit.view.deleted.v1` – Lifecycle.
- `cockpit.briefing.generated.v1` – nach NL-Summary; payload: tenantId, viewId, summaryRef (keine Prompt-Inhalte).
- `cockpit.widget.added.v1` / `cockpit.widget.removed.v1` – Widget-Änderungen.
- Briefing-Refresh abonniert `kpi.snapshot.computed.v1` / `forecast.point.computed.v1`.

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- View-Flow: withApiContext → Zod-Validate → requireApiPermission("cockpit:configure") → Persist (version++) → Event → Envelope.
- Briefing-Flow: Validate → tenantScoped Daten-Sammeln (KPI/Forecast/Benchmark) → NL-Summary (Provider) → `CockpitBriefing` → `cockpit.briefing.generated.v1`.
- Widget-Flow: Validate (sourceRef muss existieren) → Upsert → Layout-Reindex → `cockpit.widget.added.v1`.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `executive-advisor` Agent: fasst Cockpit-Abweichungen zu Handlungsempfehlungen; in Band 11 Runtime, tenantScoped.
- `cockpit-composer` Agent: schlägt rollenbasierte Widget-Sets vor.
- Keine eigene Agent-Runtime; Free-First-Provider-Policy erzwungen (kein Premium ohne Freigabe).

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- `CockpitShell`: rendert rollenbasierte Widget-Sets; reine Präsentation.
- `ExecutiveBriefingPanel`: zeigt NL-Summary aus `CockpitBriefing`; kein Client-Prompt.
- `CockpitConfigurator`: Drag&Drop-Layout, serialisiert zu `CockpitViewSchema`.
- Keine Aggregationslogik im Client; alle Werte serverseitig aus Band 81–87.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: `cockpit.test.ts` – View-Validierung, Widget-Resolver, Version-Increment, `safeRatio`-konform.
- Unit: `cockpitViewSchema.test.ts` – Ablehnung ungültiger sourceRef, fehlerhaftes layoutJson.
- Integration: state-Endpoint mit zwei Tenants; Assert View-/Widget-Trennung.
- Security-Test: `cockpit:configure`/`cockpit:read` blockiert ohne Permission; Cross-Tenant-View verweigert.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Views/Widgets/Briefings zwingend tenantId-gefiltert; Repository verweigert query ohne tenantScope.
- `requireApiPermission("cockpit:read" | "cockpit:configure")`.
- NL-Briefing-Prompts dürfen keine personenbezogenen Rohdaten enthalten; nur aggregierte Werte.
- Provider-API-Keys ausschließlich über Core-Secrets; nie in Code/Logs/Docs.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Composite-Index `(tenantId, viewId, version)` auf `CockpitView`/`CockpitWidget`.
- Widget-Daten via parallele, gecachte Endpunkt-Aufrufe (Band 81–87); p95 Cockpit-Laden < 1.2 s.
- Briefing asynchron generiert; p95 API-Trigger < 300 ms, Generierung offline.
- Layout-JSON gecached; Invalidierung bei Version-Change; Realtime-Updates über Event-Bus.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
