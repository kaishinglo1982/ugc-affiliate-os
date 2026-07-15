# CarryOS Universe – Band 22
# Masterprompt: Agency OS (VOLLSTÄNDIG)

> Band: 22 | Masterprompt: 22.0 | Status: PLANNED | Gruppe: Business Editions I
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Planungs-Masterprompt. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork. Agency OS ist eine Edition auf CarryOS Core, distributioniert als Plugin/Preset.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Bestehende Systeme werden erweitert, nicht dupliziert. Keine zweite Runtime/Engine/Queue/Finance.

- Edition als Plugin-Preset über Band-16 Factory: Agentur-Domäne (Kunden, Projekte, Kampagnen, Teams) ohne Core-Fork.
- Domänenbereiche: Account-Management, Projekt/Kampagnen-Tracking, Ressourcen-Planung, Retainer/PO-Management, Client-Reporting.
- Wiederverwendung: Band 13 Growth (Kampagnen), Band 14 Finance (Rechnung/Auslagen), Band 11 Agents (Delivery-Automatisierung).
- Multi-Client-Isolation: ein Tenant kann mehrere Agentur-Kunden (Sub-Workspaces) verwalten, strikt getrennt.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `AgencyClient` (Kunde mit Marke, Ansprechpartner, Vertragstyp Retainer/Project), `Project` (Scope, Budget, Status).
- `Campaign` (Kanäle, Ziele, Zeitraum), `Task` (Zuweisung, Aufwand, Fälligkeit), `TimeEntry` (Zeiterfassung).
- `Retainer` (monatliches Volumen, verbraucht/übrig), `Deliverable` (Asset, Freigabe-Status).
- Alle Tabellen zwingend `tenantId` + `workspaceId`; Audit über Core-Mixin.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `POST /api/v1/agency/projects` Projekt mit Budget-Zod anlegen, verknüpft mit AgencyClient.
- `POST /api/v1/agency/timeentries` Zeiteintrag buchen (Validierung gegen Projekt-Budget).
- `GET /api/v1/agency/clients/{id}/report` aggregiertes Client-Reporting (Spend, Tasks, Deliverables).
- `POST /api/v1/agency/retainers/{id}/invoice` Monatsabrechnung des Retainers via Finance OS.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `agency.project.created.v1` (Provisionierung des Client-Workspaces, Growth-Onboarding).
- `agency.timeentry.booked.v1` (Budget-Verbrauch, Warnung bei Überschreitung).
- `agency.deliverable.approved.v1` (Freigabe → Rechnungsstellungs-Trigger).
- `agency.retainer.low.v1` (Restvolumen unterschritten → Upsell-Nudge via Band 13).

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Projekt-Lifecycle: Brief → Angebot → Win → Kickoff → Delivery → Close-out.
- Retainer-Abrechnung: Perioden-Start → Zeit/Deliverable-Sammeln → Invoice → Zahlung (Finance).
- Delivery-Freigabe: Entwurf → Review → Client-Approval → Archivierung.
- Ressourcen-Planung: Auslastung pro Mitarbeiter → Konflikt-Erkennung → Umverteilung.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `DeliveryAgent`: automatische Task-Zuweisung nach Skill/Verfügbarkeit aus Ressourcenplan.
- `ReportingAgent`: generiert wöchentliche Client-Reports aus TimeEntry/Deliverable-Daten.
- `BudgetWatchAgent`: überwacht Projekt-Budget in Echtzeit, eskaliert bei Soll-Ist-Abweichung.
- Rollen: Agency Admin, Account Manager, Consultant, Client-Viewer (schreibgeschützt).

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- Agency-Ops-Dashboard: aktive Projekte, Auslastung, offene Freigaben, Retainer-Status.
- Client-Portal: eigene Kampagnen, Deliverables zur Freigabe, Transparenz-Reporting.
- Ressourcen-Board: Team-Kapazität, Konflikt-Anzeige, Drag&Drop-Zuweisung.
- Alle Views via Core-Envelope; Reporting-Charts aus Core-Chart-Package.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: Budget-Berechnung, Retainer-Verbrauch, Zeiterfassungs-Regeln.
- Integration: Projekt-Anlage mit Workspace-Provisionierung, TimeEntry-Idempotenz.
- Security: Client-Sub-Workspace-Isolation (Kunde A sieht nicht Kunde B), Rollen-Rechte.
- Finance-Brücke: Retainer-Invoice erzeugt korrekten Finance-Eintrag ohne Doppelbuchung.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Client-Workspaces strikt isoliert; Cross-Client-Queries durch Core-RBAC verhindert.
- Vertrauliche Kampagnen-Daten nur für zugewiesene Consultants sichtbar.
- Audit-Log für alle Freigabe- und Rechnungsaktionen (Compliance für Agentur-Kunden).
- Secrets von Drittanbieter-APIs (Ads/Kanal) in Core-Vault, nie im Agentur-Code/Log.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `(tenantId, projectId)`, `(tenantId, agencyClientId)`, `(tenantId, bookedAt)`.
- Reporting asynchron via Queue; große Client-Reports als Background-Job + Cache.
- Auslastungs-Aggregation gecached (TTL 10 min) pro Team.
- p95 Ziel: Projekt-Liste < 120 ms, Report-Generierung < 2 s bei 1k Tasks/Projekt.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
