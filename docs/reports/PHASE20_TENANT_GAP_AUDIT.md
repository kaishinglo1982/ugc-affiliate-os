# Phase 20 – Tenant Gap Audit

Stand: 2026-08-18  
Branch: `codex/roadmap-enterprise-implementation`

## Ergebnis

Das Prisma-Schema enthält 126 Modelle. 97 Modelle besitzen bereits ein
`workspaceId`; 29 Modelle besitzen kein direktes Tenant-Feld.

## Bewusst globale Modelle

Diese Modelle bleiben global und werden über Identität bzw. öffentlichen Intake
abgesichert:

- `User`
- `Session`
- `ContactRequest`

## Tenant-Lücken (P0)

Folgende 26 Modelle benötigen ein direktes `workspaceId` oder eine
nachweisbar gleichwertige, durchgehend erzwungene Isolation:

- `ProductScore`
- `AffiliateProgram`
- `AffiliateLink`
- `LinkClick`
- `Campaign`
- `Script`
- `ScriptVersion`
- `VideoJob`
- `MediaAsset`
- `SocialAccount`
- `SocialPost`
- `PublishJob`
- `Revenue`
- `Expense`
- `TaxSetting`
- `Integration`
- `EncryptedCredential`
- `Agent`
- `AgentRun`
- `Automation`
- `AutomationRun`
- `Notification`
- `AuditLog`
- `ExperimentVariant`
- `ExperimentResult`
- `DataQualityIssue`

## Sicherheitsbefunde

- Campaign- und Affiliate-API-Abfragen sind im Baseline-Stand global.
- Mehrere Child-Modelle verlassen sich ausschließlich auf indirekte Relationen.
- Statische Default-Workspace-IDs erlauben Writes ohne expliziten Tenant-Kontext.
- Globale Unique Constraints können Mandanten gegenseitig blockieren.
- Erfolgreiche Vercel-Builds beweisen keine Cross-Tenant-Isolation.

## Migrationsstrategie

1. Tenant-Spalten zunächst mit kontrollierter Legacy-Workspace-Zuordnung ergänzen.
2. Bestehende Datensätze über Elternrelationen auf den korrekten Workspace
   zurückführen, soweit eine tenantfähige Elternrelation existiert.
3. Alle produktiven Writes auf explizites `workspaceId` umstellen.
4. Tenant-Indizes und zusammengesetzte Unique Constraints ergänzen.
5. Cross-Tenant-Negativtests ausführen.
6. Datenbank-Defaults entfernen, sobald kein Write mehr davon abhängt.
7. Optional PostgreSQL-RLS als zweite Schutzschicht aktivieren.

## Abschlussbedingung

Phase 20 bleibt offen, bis Schema, Migration, Backfill, alle kritischen
Service-Filter und Cross-Tenant-Tests nachweisbar grün sind.
