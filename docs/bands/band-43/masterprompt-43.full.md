# CarryOS Universe – Band 43
# Masterprompt: Customer Success (VOLLSTÄNDIG)

> Band: 43 | Masterprompt: 43.0 | Status: PLANNED | Gruppe: Commerce & Sales
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork erlaubt

> Hinweis: Fachmodul baut ohne Fork auf CarryOS Core auf. Konsumiert Won-Deals aus Band 42, nutzt Health-Score aus Band 41.

## Kapitel 1 – Architektur

- Customer-Success-Modul als Package `src/modules/commerce/success/`; keine eigene Runtime, DB oder Queue.
- Onboarding, Renewal und Churn-Risiko sind fachliche Prozesse über Core-Repository mit `tenantId`-Filter.
- Verknüpfung zu Account/Deal über bestehende IDs; Finanzdaten (Renewal-Beträge) delegieren an Band 14.
- Nutzt Band-11-Agenten für Churn-Scoring und Playbook-Auswahl.

## Kapitel 2 – Datenmodelle

- Entität `CsOnboardingPlan` (id, tenantId, accountId, status, startDate, targetDate, progressPct) – Einführungs-Roadmap.
- Entität `CsPlaybook` (id, tenantId, name, triggerJson, stepsJson) – automatisierte Erfolgs-Schritte.
- Entität `CsHealthTrend` (id, tenantId, accountId, score, trend, measuredAt) – Zeitreihe des Health.
- Entität `CsRenewal` (id, tenantId, accountId, renewalDate, amountEnc, status) – Verlängerung; Betrag verschlüsselt.
- Alle Modelle zwingend `tenantId`; Schema nur im Commerce-Namespace erweitert.

## Kapitel 3 – APIs

- `POST /api/v1/commerce/success/onboarding` – Plan aus Won-Deal erzeugen; Zod `csOnboardingCreateSchema`.
- `GET /api/v1/commerce/success/accounts/:id/health` – aktueller Health-Trend, tenant-isoliert.
- `POST /api/v1/commerce/success/playbooks` – Playbook anlegen; triggert `cs.playbook.triggered.v1`.
- `GET /api/v1/commerce/success/renewals?dueBefore=` – anstehende Verlängerungen, paginiert.
- `PATCH /api/v1/commerce/success/onboarding/:id/progress` – Fortschritt; Audit via Band 10.

## Kapitel 4 – Events

- `cs.onboarding.started.v1` – nach Plan-Erstellung aus `pipeline.deal.won.v1`.
- `cs.health.updated.v1` – konsumiert `crm.account.health.updated.v1`, schreibt `CsHealthTrend`.
- `cs.churn.risk.detected.v1` – bei Score-Unterschreitung; für Agent-Eskalation.
- `cs.renewal.due.v1` – bei anstehender Verlängerung; konsumiert von Band 14.
- Events versioniert über Outbox; Beträge nur verschlüsselt im Payload.

## Kapitel 5 – Workflows

- Onboarding-Start: Consume `pipeline.deal.won.v1` → Playbook-Auswahl → Plan-Persistenz → `cs.onboarding.started.v1`; idempotent via Deal-Id.
- Health-Trend: Consume `crm.account.health.updated.v1` → Trend-Speicherung → ggf. Churn-Risk-Event.
- Renewal-Reminder: scheduled → `CsRenewal` prüfen → `cs.renewal.due.v1`; ExecutionKey-geschützt.
- Alle Schritte serverseitig autorisiert, tenant-gebunden, keine Logik im Handler.

## Kapitel 6 – Agenten

- `CsChurnAgent`: bewertet `CsHealthTrend` und flags Risiko-Accounts.
- `CsPlaybookAgent`: wählt passendes Playbook anhand `triggerJson` (Stage, Score, Industry).
- `CsRenewalAgent`: bereitet Renewal-Kommunikation vor und eskaliert bei Betragsabweichung.
- Registrierung in Band-11-Runtime; bestehende Tool-Schnittstellen, keine eigene Infra.

## Kapitel 7 – UI

- `SuccessAccountHealth` zeigt Trend-Verlauf und Churn-Flag, gefiltert nach `tenantId`.
- `OnboardingBoard` visualisiert Pläne je Status; schreibt nur via Progress-API.
- `RenewalCalendar` listet anstehende Verlängerungen aus paginierter API.
- Komponenten unter `src/modules/commerce/success/ui/`, nur v1-APIs.

## Kapitel 8 – Tests

- Unit (Vitest): Playbook-Trigger-Auswertung, Churn-Schwellen, Progress-Berechnung.
- Integration: Won-Deal → Onboarding-Plan → Event; Tenant-Isolation verifiziert.
- Security: Scope-Verweigerung, verschlüsselter Renewal-Betrag, Cross-Tenant blockiert.
- Fehlerpfade: fehlender Account, ungültiges Playbook, doppelter Onboarding.

## Kapitel 9 – Security

- Auth über Core (keine zweite); Autorisierung via `requireApiPermission` (`success:read`, `success:write`).
- Tenant-Isolation durchgehend; Renewal-Beträge verschlüsselt, nie in Logs/Prompts.
- Audit über Band-10 für Onboarding- und Renewal-Schreiboperationen.

## Kapitel 10 – Performance

- Indizes auf `(tenantId, accountId, measuredAt)`, `(tenantId, renewalDate)`, `(tenantId, status)`.
- Health-Trend asynchron schreiben; Dashboard-Queries mit Cursor, p95 < 200 ms.
- Playbook-Auswertung gecached; keine vollen Scans bei Renewal-Fälligkeit.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines, keine Core-Fork.
7. Tenant-Isolation-Test grün. 8. Encryption-Verifizierung Renewal-Beträge.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
