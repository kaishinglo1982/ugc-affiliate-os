# Phase 20 – Tenant Isolation Finalization

Stand: 2026-08-18  
Branch: `codex/roadmap-enterprise-implementation`  
Pull Request: #33

## Ergebnis

Das Prisma-Schema enthält 126 Modelle. 97 Modelle waren bereits direkt
tenantfähig. Die 26 zuvor identifizierten Lücken besitzen nun ein verpflichtendes
`workspaceId` ohne Datenbank-Default. `User`, `Session` und
`ContactRequest` bleiben bewusst global.

## Umgesetzte Maßnahmen

- Additive Tenant-Spalten und Indizes für alle 26 Lücken.
- Relationaler Backfill für Child-Datensätze vor Entfernung der Defaults.
- Entfernung aller 26 kanonischen Legacy-Workspace-Defaults.
- Tenantfähige Unique Keys:
  - `Agent(workspaceId, key)`
  - `Integration(workspaceId, providerKey)`
- Explizite Workspace-Zuordnung in Seeds und kritischen Schreibpfaden.
- Tenant-Filter für Campaigns, Affiliate, Content, Media, Scripts, Videos,
  Publishing, Finance, Integrationen, Agenten, Notifications, Audit,
  Experimente und Data Quality.
- Atomisches Claiming der Publish-Queue.
- Workspace-Kontext in Audit-Einträgen.
- Schema-/Migrations-Vertragstest:
  `src/server/services/__tests__/phase20-tenant-finalization.test.ts`
- Reale PostgreSQL-Verifikation:
  `pnpm run db:verify:phase20`

## Migrationen

1. `20260818073000_phase20_legacy_tenant_keys`
   - additive Spalten und temporäre Defaults
2. `20260818093000_phase20_finalize_tenant_isolation`
   - relationale Backfills
   - Compound Unique Keys
   - Entfernung sämtlicher temporärer Defaults

## Verifikationsmatrix

| Gate | Status |
|---|---|
| Prisma-Schema ohne Legacy-Defaults | implementiert |
| Relationale Backfill-Migration | implementiert |
| Tenantfähige Unique Keys | implementiert |
| Vercel-Anwendungsbuild | vorheriger Head grün; finaler Head läuft |
| Statischer Phase-20-Vertragstest | implementiert |
| PostgreSQL-Migrationstest | in CI integriert, noch nicht ausgeführt |
| GitHub Actions | für PR-Head nicht gestartet |
| Cross-Tenant-Laufzeitschutz | Services und Negativpfade implementiert |

## PostgreSQL-Gate

Der Verifikationsbefehl prüft nach `prisma migrate deploy`:

1. Alle 26 `workspaceId`-Spalten besitzen keinen Default.
2. Agent- und Integration-Compound-Indizes existieren.
3. Derselbe Agent-Key ist in zwei Workspaces erlaubt.
4. Ein doppelter Agent-Key im selben Workspace wird mit PostgreSQL-Code
   `23505` abgelehnt.
5. Ein Agent-Insert ohne Workspace wird mit `23502` abgelehnt.
6. Alle Testdaten werden per Rollback entfernt.

## Abschlussbedingung

Die Implementierung von Phase 20 ist vollständig. Das operative Gate bleibt
solange gelb, bis `pnpm run db:migrate:deploy`,
`pnpm run db:verify:phase20` und die Tests in einer PostgreSQL-CI-Umgebung
erfolgreich gelaufen sind. Ein Vercel-Build allein ersetzt dieses Datenbank-Gate
nicht.
