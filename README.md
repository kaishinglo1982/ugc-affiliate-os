# UGC Affiliate OS

Multi-Tenant-Plattform für eine KI-gestützte UGC- und Affiliate-Organisation:
Produktrecherche, Kampagnen, Content-Produktion, Creator-Aufträge, Publishing,
Attribution, Revenue, Compliance, Provider-Routing und Enterprise-Steuerung in
einem System.

> Entwicklungsstand: Roadmap-Implementierung bis Phase 40 auf
> `codex/roadmap-enterprise-implementation` / Draft-PR #33. Der aktuelle
> Vercel-Build ist grün. Produktives Go-live bleibt bis zum erfolgreichen Lauf
> aller CI-, PostgreSQL- und betrieblichen Evidence-Gates **NO-GO**.

## Funktionsumfang

### Content, Affiliate und Automation

- Produkt- und Affiliate-Programmverwaltung
- Kampagnen, Scripts, Medien, Videos und Social Publishing
- Workflows, Agenten, Tools, Memory, Approvals und Budgets
- Revenue-, Expense- und Business-Portfolio-Sichten
- Audit Logs, Notifications und Data-Quality-Prüfungen

### BYOK Provider Gateway

Kunden können eigene Provider-Verbindungen für LLM, Bild, Video, Voice, Avatar,
Search und Automation verwenden. Das Routing berücksichtigt:

- Workspace-Verbindung und Capability
- Allow-/Deny-Listen und Regionen
- Free-, Cost-, Quality- oder Manual-Strategie
- Kosten pro Aufruf und Tagesbudget
- Provider Health, Fallback und Circuit Breaker
- Approval für Premium-Fallbacks

Secrets werden nicht über die Provider-APIs zurückgegeben.

### Creator Production und Marketplace

- Creator Production Cockpit
- auditierter Agent-Dispatch
- Creator Profiles und Engagements
- Briefings und versionierte Deliverables
- Abnahmeprozesse mit zwingender Rechtebestätigung
- tenant-sichere Media- und Campaign-Verknüpfungen

### Audience, Commerce und Compliance

- pseudonymisierte Audience Contacts
- Rechtsgrundlage, Marketing-Consent, Opt-out und Retention
- Affiliate Offers und Commerce-Portfolio
- Compliance Evidence und Ablaufkontrolle
- evidenzpflichtige Go-live-Entscheidungen

### Executive und Enterprise Control

- Executive Objectives
- Operational Kill Switches
- Phase-30-Go-live-Gates
- globale und regionale Phase-40-Scale-Gates
- Reliability Incidents mit Severity, Runbook und Recovery Evidence
- Readiness blockiert bei offenen Pflichtgates, aktiven Kill Switches oder
  kritischen Incidents

### Global Scale: Phase 31–40

- kontrollierte Growth Experiments mit Budgetlimit und Stop-Regel
- Markt- und sprachbezogene Localization Projects
- idempotente, rechtegebundene Content Syndication
- Attribution Touchpoints mit Confidence statt Scheingenauigkeit
- versionierte Financial Forecasts und Szenarien
- Brand-/IP-Registry mit Provenienz und Lizenznachweis
- scope-begrenzte Partner Connections ohne Credential-Rückgabe
- Governed Data Exports mit Zweck, Rechtsgrundlage und Retention
- Reliability Incident Control
- regionale Scale Certification

Die Roadmaps und Abschlussberichte befinden sich unter:

- [Roadmap Phase 21–30](docs/roadmap/UGC-AFFILIATE-OS-ROADMAP-PHASES-21-30.md)
- [Roadmap Phase 31–40](docs/roadmap/UGC-AFFILIATE-OS-ROADMAP-PHASES-31-40.md)
- [Abschlussbericht Phase 23–30](docs/reports/PHASE23_30_BULK_COMPLETION.md)
- [Abschlussbericht Phase 31–40](docs/reports/PHASE31_40_BULK_COMPLETION.md)

## Architektur und Sicherheitsprinzipien

- Next.js App Router und TypeScript im Strict Mode
- Prisma mit PostgreSQL
- Zod-Validierung für externe Eingaben
- serverseitige Authentifizierung und RBAC
- Service-/Domain-Logik außerhalb der Route Handler
- explizite `workspaceId`-Filterung für tenant-gebundene Reads und Writes
- Compound-Uniqueness statt globaler Business Keys
- Audit Trail für governancepflichtige Aktionen
- keine globalen Tenant-Defaults in den finalisierten Phase-20/21–40-Modellen
- keine Freigabe ohne Rechte-, Consent- oder Evidence-Nachweis, wo erforderlich

## Voraussetzungen

- Node `>=20.9.0 <25`
- pnpm `11.13.0` via Corepack
- PostgreSQL

```bash
corepack enable
corepack prepare pnpm@11.13.0 --activate
pnpm install
```

## Umgebung

`.env.example` nach `.env.local` kopieren und mindestens setzen:

- `DATABASE_URL`
- `AUTH_SECRET` mit mindestens 32 Zeichen
- `CREDENTIAL_ENCRYPTION_KEY` als 64 Hex-Zeichen, zum Beispiel aus
  `openssl rand -hex 32`
- `APP_URL`, lokal beispielsweise `http://localhost:3000`

Für Seed und Administration werden `ADMIN_EMAIL` sowie entweder
`ADMIN_PASSWORD_HASH` für Produktion oder `ADMIN_PASSWORD` für lokale/CI-
Umgebungen benötigt. Es existieren keine voreingestellten Login-Daten; der Seed
bricht ohne explizite Zugangsdaten ab. CI erzeugt ausschließlich kurzlebige,
maskierte E2E-Zugangsdaten zur Laufzeit. Vor dem Aktivieren geplanter Worker muss
`WORKER_SECRET` gesetzt sein.

## Datenbank

```bash
pnpm run db:generate
pnpm run db:migrate
pnpm run db:seed
pnpm run db:status
```

In CI und Produktion:

```bash
pnpm run db:migrate:deploy
pnpm run db:verify:phase20
pnpm run db:verify:phase30
pnpm run db:verify:phase40
```

`db:reset` nur für kurzlebige lokale Testdatenbanken verwenden.

## Lokale Entwicklung

```bash
pnpm run dev
```

Die Anwendung läuft standardmäßig auf `http://localhost:3000`. Ohne S3-
Konfiguration werden lokale Medien unter `.storage/` abgelegt. Produktion sollte
`S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` sowie optional
`S3_ENDPOINT` und `S3_REGION` verwenden.

## Wichtige Control APIs

- `GET/POST /api/providers/policies`
- `POST /api/providers/route`
- `POST /api/providers/usage`
- `GET /api/creator-cockpit`
- `POST /api/creator-cockpit/commands`
- `GET /api/business-portfolio`
- `GET/POST /api/executive-control`
- `GET/POST /api/scale-control`
- `POST /api/creators`
- `POST /api/creators/deliverables`
- `POST /api/audience/contacts`
- `POST /api/compliance/evidence`

Alle tenant-gebundenen Endpunkte lösen Workspace und Berechtigung serverseitig
auf.

## Validierung

```bash
pnpm run architecture:check
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
pnpm run validate:deploy
```

E2E benötigt eine migrierte und geseedete PostgreSQL-Datenbank:

```bash
pnpm exec playwright install chromium
pnpm run build
pnpm run test:e2e
```

`playwright.config.ts` startet `pnpm start` automatisch, sofern
`E2E_SKIP_WEBSERVER` nicht gesetzt ist.

## Health Checks und Worker

- `GET /api/health`
- `GET /api/health/database`
- `POST /api/analytics/jobs/run`
- `POST /api/products/jobs/run`
- `POST /api/publishing/worker`

Worker-Aufrufe benötigen `Authorization: Bearer $WORKER_SECRET`.

## CI- und Go-live-Status

GitHub Actions ist so konfiguriert, dass es PostgreSQL startet, Migrationen
einspielt, die Phase-20-, Phase-30- und Phase-40-Datenbankgates ausführt und danach
Architekturcheck, Typecheck, Lint, Tests, Build und E2E prüft.

Für den aktuellen PR-Head wurde GitHub Actions bislang nicht gestartet. Deshalb
gelten die PostgreSQL- und vollständigen Quality Gates noch nicht als grün, obwohl
der Vercel-Anwendungsbuild erfolgreich ist.

Produktionsfreigabe erfordert zusätzlich reale Nachweise für:

- Backup und Restore
- Disaster Recovery und Rollback
- Cross-Tenant-, RBAC-, Vault- und API-Security
- Last, Queue, Retry, DLQ und Provider-Failover
- SLO, Monitoring und Incident Response
- fachliche Compliance-, Datenschutz-, Steuer- und Finance-Prüfung
- regionale Canary-Rollouts mit messbaren Stop-Kriterien

## Entwicklungs-Agentenschwarm

Der Entwicklungs-Swarm ist getrennt von den Runtime-Agenten versioniert:

- `docs/agent-swarm.md`
- `.agents/`
- `docs/swarm-workflows.md`
