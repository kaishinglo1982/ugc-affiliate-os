# CarryOS Universe – Band 41
# Masterprompt: CRM Enterprise (VOLLSTÄNDIG)

> Band: 41 | Masterprompt: 41.0 | Status: PLANNED | Gruppe: Commerce & Sales
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork erlaubt

> Hinweis: Fachmodul baut ohne Fork auf CarryOS Core auf. Tenant-Isolation, Band-10-API-Standard, Audit und Band-11-Agenten werden genutzt.

## Kapitel 1 – Architektur

- Das CRM-Modul ist eine Fachdomäne im Commerce & Sales-Cluster und registriert sich als Package unter `src/modules/commerce/crm/` ohne eigene Runtime, eigene DB-Verbindung oder eigenen EventBus.
- Kontakt-, Firmen- und Interaktionsdaten werden über die bestehende CarryOS-Core-Repository-Schicht mit durchgehendem `tenantId`-Filter persistiert; Relationen zu Account, Lead und Opportunity sind rein fachlich, nicht architektonisch isoliert.
- Die CRM-Logik nutzt die Band-11-Agenten-Runtime für Score-Berechnung und Auto-Enrichment; Autorisierung erfolgt über `requireApiPermission` aus Band 10.
- Keine eigene Finance-Logik: Rechnungs- und Zahlungsbezüge delegieren an Band 14 (Business & Finance OS) über dessen vertragliche Events.

## Kapitel 2 – Datenmodelle

- Entität `CrmContact` (id, tenantId, firstName, lastName, emailHash, phoneHash, lifecycleStage, ownerAgentId, sourceChannel, tagsJson, createdAt, updatedAt) – PII ausschließlich gehasht oder verschlüsselt.
- Entität `CrmAccount` (id, tenantId, name, industry, employeeCount, billingAddressEnc, primaryContactId, healthScore) – Firmenstamm mit Verknüpfung zu mehreren Kontakten.
- Entität `CrmInteraction` (id, tenantId, contactId, accountId, channel, direction, contentRef, occurredAt) – Audit-fähige Touchpoints (Call, Mail, Meeting, Portal).
- Entität `CrmSegment` (id, tenantId, name, filterJson, autoRefreshCron) – dynamische Zielgruppen auf Basis von Lifecycle- und Score-Attributen.
- Alle Modelle erben zwingend `tenantId`; Prisma-Schema-Erweiterung erfolgt nur innerhalb des Commerce-Namespaces, keine Core-Fork.

## Kapitel 3 – APIs

- `POST /api/v1/commerce/crm/contacts` – Kontakt anlegen mit Zod-Schema `crmContactCreateSchema`, Envelope-Antwort, `withApiContext`-Wrapping.
- `GET /api/v1/commerce/crm/accounts/:id` – Account mit verknüpften Kontakten, paginiert, tenant-isolierter Query.
- `POST /api/v1/commerce/crm/interactions` – Touchpoint erfassen; triggert `crm.interaction.recorded.v1`.
- `GET /api/v1/commerce/crm/segments/:id/members` – Segmentmitglieder auflösen; respektiert `filterJson`.
- `PATCH /api/v1/commerce/crm/contacts/:id/lifecycle` – Lifecycle-Stufe wechseln; Audit-Log via Band-10-Audit.

## Kapitel 4 – Events

- `crm.contact.created.v1` – nach Kontakterstellung; Payload enthält gehashte Identität und Source-Channel.
- `crm.interaction.recorded.v1` – nach jedem Touchpoint; versorgt Customer-Success- und Pipeline-Module.
- `crm.segment.membership.changed.v1` – wenn Auto-Segmentierung Kontakte neu zuordnet.
- `crm.account.health.updated.v1` – Health-Score-Neuberechnung durch Band-11-Agent; konsumiert von Band 43.
- Alle Events versioniert über bestehende Outbox; niemals PII im Klartext im Event-Payload.

## Kapitel 5 – Workflows

- Kontakt-Erstellung: ApiContext → Zod-Validation → requireApiPermission(crm:write) → CrmService.create → Repository → Outbox-Event → Envelope.
- Segment-Refresh: scheduled ExecutionKey → Filter-Auswertung → Batch-Update → `crm.segment.membership.changed.v1`; idempotent via ExecutionKey.
- Health-Score: Band-11-Agent trigger → Interaktions-Aggregation → Score-Persistenz → `crm.account.health.updated.v1`.
- Keine Fachlogik in Route-Handlern; alle Schritte serverseitig autorisiert und tenant-gebunden.

## Kapitel 6 – Agenten

- `CrmEnrichmentAgent` (Band 11): reichert neue Kontakte mit Quell-Attributen an und schlägt Lifecycle-Stufe vor.
- `CrmHealthAgent`: berechnet Account-Health-Score aus Interaktionsfrequenz, Offen-Quote und CSAT.
- `CrmSegmentAgent`: wertet `filterJson` periodisch aus und pflegt dynamische Segmente.
- Agenten registrieren sich in der Band-11-Runtime, nutzen bestehende Tool-Schnittstellen, keine eigenständige LLM-Infrastruktur.

## Kapitel 7 – UI

- Dashboard `CrmAccountList` zeigt Accounts mit Health-Score-Badge, gefiltert nach `tenantId`; keine Fachlogik im Client.
- Detailansicht `CrmContactTimeline` rendert `CrmInteraction`-Verlauf aus paginierter API.
- `CrmSegmentBuilder` als deklaratives Filter-UI, das `filterJson` erzeugt, nicht ausführt.
- Komponenten liegen unter `src/modules/commerce/crm/ui/` und konsumieren ausschließlich die v1-APIs.

## Kapitel 8 – Tests

- Unit (Vitest): Lifecycle-Übergänge, Segment-Filter-Auswertung, Health-Score-Formel.
- Integration: Kontakt-Erstellung bis Event in Outbox; Tenant-Isolation über zwei Tenants verifiziert.
- Security: `requireApiPermission`-Verweigerung, PII-Hashing, fehlender tenantId blockiert Query.
- Erfolgs- und Fehlerpfade (Invalid Zod, Duplicate Contact, Cross-Tenant-Zugriff) abgedeckt.

## Kapitel 9 – Security

- Authentifizierung ausschließlich über bestehende Core-Auth (keine zweite Auth).
- Autorisierung via `requireApiPermission` mit Scopes `crm:read`, `crm:write`; Tenant-Isolation durchgehend erzwungen.
- PII (E-Mail, Telefon, Adresse) nur gehasht/verschlüsselt in DB und Logs; Secrets nie in Code, Prompts oder Docs.
- Audit-Trail über Band-10-Audit für alle schreibenden CRM-Operationen.

## Kapitel 10 – Performance

- Indizes auf `(tenantId, emailHash)`, `(tenantId, lifecycleStage)`, `(tenantId, accountId)` für Interaktions-Queries.
- Segment-Refresh asynchron via Queue; Cache für häufig gelesene Account-Listen (p95 < 200 ms).
- Batch-Insert für Bulk-Interaktionsimporte; paginierte APIs mit Cursor, keine Offset-Scans auf großen Tabellen.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines, keine Core-Fork.
7. Tenant-Isolation-Test grün. 8. PII-Hashing verifiziert.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
