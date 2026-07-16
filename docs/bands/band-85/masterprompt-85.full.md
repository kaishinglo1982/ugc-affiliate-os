# CarryOS Universe – Band 85
# Masterprompt: AI Reporting (VOLLSTÄNDIG)

> Band: 85 | Masterprompt: 85.0 | Status: PLANNED | Gruppe: Analytics
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Erweitert `src/lib/analytics`. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Bestehende Systeme werden erweitert, nicht dupliziert. Keine zweite Runtime/Engine/Queue/Finance.

- Report-Generator in `src/lib/analytics/reporting.ts`: templatisierte Berichte (PDF/HTML/Markdown) aus bereits aggregierten Metriken (Band 81–84); keine eigene Render-Engine, Nutzung bestehender Core-Templates.
- NL-Summary-Service: nutzt Free-First LLM-Provider über `src/lib/analytics/provider` für natürlichsprachliche Zusammenfassungen; Premium nur nach Freigabe.
- Report-Scheduler: asynchron via Core-Queue; tenantId als Partition, keine Cross-Tenant-Inhalte.
- Alle Zahlen stammen aus versionierten `METRIC_DEFINITIONS`; Generator fügt keine eigene Fachlogik hinzu.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `ReportTemplate`: tenantId, name, sectionConfigJson (Zod-validiert), format, locale, version.
- `ReportJob`: tenantId, templateId, scheduleCron?, status, lastRunAt, nextRunAt.
- `ReportArtifact`: tenantId, jobId, periodStart, periodEnd, storageRef, format, generatedAt.
- Berichte referenzieren Cubes/KPIs/Forecasts; keine Rohdaten-Duplikate geschrieben.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `GET /api/v1/reports/templates` – Liste Report-Templates des Tenants.
- `POST /api/v1/reports/templates` – Zod `ReportTemplateSchema`; idempotent via ExecutionKey.
- `POST /api/v1/reports/jobs/:id/run` – sofortige Generierung; `requireApiPermission("report:generate")`.
- `GET /api/v1/reports/artifacts?jobId=...` – Liste Artefakte als Envelope (kein Binär-Inhalt im Body).

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `report.template.created.v1` / `report.template.updated.v1` / `report.template.deleted.v1` – Lifecycle.
- `report.job.completed.v1` – nach Generierung; payload: tenantId, jobId, artifactRef, format.
- `report.nl.summary.generated.v1` – nach LLM-Zusammenfassung; Metadaten ohne Prompt-Inhalte.
- Report-Jobs abonnieren `kpi.snapshot.computed.v1` / `forecast.point.computed.v1` als Daten-Trigger.

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Template-Flow: withApiContext → Zod-Validate → requireApiPermission("report:configure") → Persist → Event → Envelope.
- Run-Flow: Validate → tenantScoped Daten-Sammeln (Cubes/KPI/Forecast) → Template-Render → NL-Summary (Provider) → `ReportArtifact` → `report.job.completed.v1`.
- Scheduler-Flow: Cron → Job-Trigger → Run → nextRunAt-Update; idempotent via Job-ExecutionKey.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `report-writer` Agent: baut NL-Zusammenfassungen aus Metrik-Deltas; in Band 11 Runtime, tenantScoped.
- `report-curator` Agent: schlägt passende Templates/Sektionskonfiguration vor.
- Keine eigene Agent-Runtime; Free-First-Provider-Policy erzwungen (kein Premium ohne Freigabe).

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- `ReportTemplateEditor`: konfiguriert Sektionen/Format; serialisiert zu `ReportTemplateSchema`.
- `ReportLibrary`: listet `ReportArtifact`s mit Download-Links; ruft `/api/v1/reports/*` auf.
- `ReportPreview`: rendert HTML/Markdown-Preview; reine Präsentation.
- Keine Aggregationslogik im Client; Berichte kommen fertig vom Service.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: `reporting.test.ts` – Template-Render mit Mock-Daten, Section-Konfig-Validierung.
- Unit: `provider/summary.test.ts` – Mock-LLM liefert deterministische Zusammenfassung.
- Integration: run-Endpoint mit zwei Tenants; Assert Artefakt-Trennung.
- Security-Test: `report:generate` blockiert ohne Permission; Cross-Tenant-Artifact-Zugriff verweigert.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Templates/Jobs/Artifacts zwingend tenantId-gefiltert; Repository verweigert query ohne tenantScope.
- `requireApiPermission("report:read" | "report:configure" | "report:generate")`.
- NL-Summary-Prompts dürfen keine personenbezogenen Rohdaten enthalten; nur aggregierte Werte.
- Provider-API-Keys ausschließlich über Core-Secrets; nie in Code/Logs/Docs.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Composite-Index `(tenantId, jobId, generatedAt)` auf `ReportArtifact`.
- Report-Generierung asynchron via Queue; p95 API-Antwort (Trigger) < 300 ms, Generierung offline.
- Gerenderte Artefakte gecached (storageRef); Re-Render nur bei Template-Änderung.
- NL-Summary mit kurzem Provider-Timeout + Fallback-Text bei Free-Tier-Limit.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
