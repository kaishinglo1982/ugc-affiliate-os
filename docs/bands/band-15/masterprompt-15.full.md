# CarryOS Universe – Band 15
# Masterprompt: Enterprise Infrastructure (VOLLSTÄNDIG)

> Band: 15
> Masterprompt: 15.0 (vollständig, konsolidiert)
> Status: PLANNED
> Abhängigkeit: Band 10–14
> Ziel: Multi-Tenant-Härtung, Observability, Secrets, Deployment-Readiness, Scheduler-Entscheidung.

---

## Kapitel 1 – Architektur

Erweitert `src/lib/observability`, `src/lib/config`, Secrets-Handling.
Buildet auf `docs/agent-swarm-deploy-roadmap.md` (P0/P1/P2). Keine neuen
Infra-Engines.

---

## Kapitel 2 – Datenmodelle

- `TenantConfig` (tenantId, flags, limits)
- `DeploymentCheck` (runId, status, artifacts)

---

## Kapitel 3 – APIs

- `GET /api/v1/health` (vorhanden, erweitern)
- `GET /api/v1/health/database`
- `GET /api/v1/infra/tenant-config`

---

## Kapitel 4 – Events

- `infra.deploy.check.v1`
- `infra.tenant.config.changed.v1`

---

## Kapitel 5 – Workflows

Prisma module-scope-Init fixen (siehe deploy-roadmap P0) → Health-Checks
→ Scheduler-Entscheidung (Vercel Cron / system cron / queue runner) →
Smoke-Checks nach Deploy.

---

## Kapitel 6 – Agenten

Infra-Agent für Deployment-Smoke-Checks (Band 11 Runtime).

---

## Kapitel 7 – UI

Infra-Dashboard: Health, Tenant-Limits, Deploy-Status.

---

## Kapitel 8 – Tests

- Unit: Tenant-Config-Logik
- Integration: Health-Endpunkte gegen DB
- Security: Secrets nie im Klartext

---

## Kapitel 9 – Security

- Produktions-Secrets provisonieren (DATABASE_URL, AUTH_SECRET,
  CREDENTIAL_ENCRYPTION_KEY, APP_URL, WORKER_SECRET)
- Persistente Objekt-Speicherung (S3-kompatibel) in Produktion
- Tenant-Isolation durchgehend erzwungen

---

## Kapitel 10 – Performance

- Health-Checks < 200 ms
- Observability-Sampling konfigurierbar

---

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün.
6. Architekturtests: keine zweiten Infra-Engines.

---

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
