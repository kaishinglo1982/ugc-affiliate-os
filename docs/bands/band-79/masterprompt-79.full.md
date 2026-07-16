# CarryOS Universe – Band 79
# Masterprompt: Disaster Recovery (VOLLSTÄNDIG)

> Band: 79 | Masterprompt: 79.0 | Status: PLANNED | Gruppe: Enterprise
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

## Kapitel 1 – Architektur

Beschreibt die DR-Schichten. Erweitert bestehende Module statt Neuaufbau.

- Thema: Backup, Replikation und Wiederanlauf-Orchestrierung mit tenant-aware RPO/RTO.
- DR-Orchestrator in `src/lib/dr/orchestrator.ts`; nutzt bestehende DB-Replikation + Object-Store.
- Integration: Observability (78) für Failover-Telemetrie, Audit (76) für DR-Ereignisse.
- Trennung: Backup (kontinuierlich) vs. Failover (regionwechsel) vs. Restore (Point-in-Time).
- Keine zweite Persistenz-Architektur: DR nutzt bestehende Tenant-Datenbank-Topologie.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `BackupJob`: tenantId, kind (full/incremental), status, startedAt, finishedAt, sizeBytes.
- `RecoveryPoint`: tenantId, jobId, snapshotRef, rpoAt, restorable.
- `FailoverPlan`: tenantId, regionPrimary, regionSecondary, rtoSec, rpoSec, lastTestedAt.
- `DrRunbook`: tenantId, stepOrder, action, owner, automated.
- Tabellen tenant-isoliert via `tenant.ts`; RecoveryPoints nach tenantId+region partitioniert.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `GET /api/v1/dr/recovery-points` – verfügbare Restore-Punkte (Zod `RpoQuery`).
- `POST /api/v1/dr/restore` – Point-in-Time-Restore triggern (Permission `dr.admin`), idempotent.
- `POST /api/v1/dr/failover` – Region-Failover auslösen (Zod `FailoverInput`).
- `GET /api/v1/dr/plans` – Failover-Pläne + letzter Teststatus.
- Endpunkte nutzen `withApiContext`; kritische Ops nur mit `dr.admin`.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `dr.backup.completed.v1` – Backup-Job erfolgreich.
- `dr.restore.started.v1` / `dr.restore.completed.v1` – Restore-Lifecycle.
- `dr.failover.executed.v1` – Failover durchgeführt (kritisch, auditpflichtig).
- `dr.drill.completed.v1` – DR-Test/Wiederanlaufübung abgeschlossen.
- Consumer: Audit (76), Observability (78), Monitoring (77).

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Backup: Scheduler → Snapshot → `BackupJob`/`RecoveryPoint` → Event.
- Restore: Antrag → Validierung → Restore in Isolation → Verify → Cutover → Event.
- Failover: Trigger → DNS/Route-Umschaltung → Secondary-Promotion → `dr.failover.executed.v1`.
- Drill: geplanter Test → Failover-Sim → `dr.drill.completed.v1` → RTO/RPO-Report.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `dr-orchestrator` Agent: überwacht Backup-Gesundheit, triggert automatischen Failover bei Ausfall.
- `recovery-validator` Agent: verifiziert Recovery-Points regelmäßig auf Wiederherstellbarkeit.
- Registrierung in Band-11-Runtime; kein eigener Loop.

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- `src/app/app/dr` Konsole: Backup-Status, Recovery-Points, Failover-Plan, Drill-Historie.
- Restore-Dialog (Server-Action → API) mit RPO-Auswahl; Confirmation-Gate.
- Keine Restore-Logik im Client; serverseitig über `orchestrator.ts`.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: `orchestrator.ts` RPO-Berechnung, Failover-Reihenfolge, Restore-Validierung.
- Integration: Backup → RecoveryPoint → Restore liefert konsistenten Stand.
- Security-Test: Cross-Tenant Recovery-Point nicht zugreifbar; Restore isoliert pro Tenant.
- Negative: Restore während aktivem Failover blockiert (Mutex), RPO-überschreitung eskaliert.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- AuthN über Session-System; AuthZ via `rbac.ts` mit `dr.*`-Permissions.
- Tenant-Isolation via `tenant.ts`; Backups verschlüsselt, tenant-getrennt gespeichert.
- Keine Klartext-Secrets in Snapshots; Vault-Referenzen bleiben Referenzen.
- Failover-Events manipulationssicher (Audit 76), da kritische Infrastrukturänderung.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `RecoveryPoint(tenantId, rpoAt)`, `BackupJob(tenantId, finishedAt)`.
- Backup inkrementell/asynchron; Restore über parallele Streams, p95 RTO eingehalten.
- Failover-Umschaltung < RTO-Ziel; Health-Check via Observability (78).
- RecoveryPoint-Listing gecached (TTL 30s) für schnelle Drill-Planung.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Security-Test: Cross-Tenant-DR-Block + verschlüsselte Backups bestanden.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
