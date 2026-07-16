# CarryOS Universe – Band 16
# Masterprompt: Industry Solution Factory (VOLLSTÄNDIG)

> Band: 16 | Masterprompt: 16.0 | Status: DOCUMENTED | Gruppe: Core Intelligence
> Abhängigkeit: Band 10 (API Governance), Band 11 (Agentic OS), Band 12–15

> Hinweis: Dieser Band hat Code-Bezug im Repository; Masterprompt verweist auf bestehende Module in `src/lib/content-intelligence/`, `src/lib/recommendation/`, `src/lib/finance/`, `src/lib/observability/` und `src/server/services/agents.ts`.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Die Industry Solution Factory ist der Generator für Branchen-Editionen (Band 17+): sie kombiniert Content-, Growth-, Finance- und Infra-Bausteine zu konfigurierbaren Paketen, OHNE Core zu forken. Keine zweite Runtime/Engine/Queue/Finance.

- Composition-over-Fork: Branchen-Editionen referenzieren Band 12–15 via Konfiguration, nie via Code-Duplikat.
- Factory-Manifest (`IndustryPack`) deklariert aktive Module, Agent-Rollen, Permissions und Tenant-Templates.
- Alle Aktivierung läuft über Band-11-Agenten (`agents.ts`); keine eigene Orchestrierung.
- Wiederverwendung der Observability-`METRICS` als einzige Telemetrie-Quelle.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `IndustryPack` (key, label, version, activeModules JSON), `IndustryPackModule` (referenziert Band 12–15 Modul-Key).
- `TenantEdition` (tenantId, industryPackId, config JSON) — Bindung Tenant↔Edition.
- `EditionActivationLog` mit `correlationId`, `agentRunId` für Nachvollziehbarkeit.
- Alle Reads über Repository mit `tenantId`-Filter; Pack-Definitionen global, aber Activation tenant-scoped.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `GET /api/v1/factory/packs` – listet verfügbare `IndustryPack`s mit aktiven Modulen.
- `POST /api/v1/factory/activate` – bindet `IndustryPack` an Tenant (`TenantEdition`), idempotent.
- `GET /api/v1/factory/edition/:tenantId` – aktive Edition-Konfiguration (tenant-isoliert).
- `POST /api/v1/factory/modules/toggle` – Modul in Edition aktivieren/deaktivieren (Permission-gated).

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `factory.pack.activated.v1` – Tenant↔Edition Bindung, triggert Modul-Provisionierung.
- `factory.module.enabled.v1` / `factory.module.disabled.v1` – Modul-Lifecycle in Edition.
- `factory.edition.deprovisioned.v1` – bei Wechsel/Aufhebung der Edition.
- `factory.composition.audited.v1` – Audit bei Änderung aktiver Module.

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Activate-Flow: `withApiContext` → Zod → `requireApiPermission("factory:activate")` → `TenantEdition`-Upsert (idempotent via ExecutionKey) → `factory.pack.activated.v1`.
- Module-Toggle-Flow: Validierung gegen `IndustryPackModule` → Config-Update → Event → Audit.
- Provisioning-Flow: Band-11 `growth-optimizer`/`finance-reconciler` Agenten werden editions-spezifisch aktiviert.
- Keine Fachlogik in Route Handlern; Factory-Services im Service-Layer.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime.

- `pack-composer` Agent: validiert `IndustryPack`-Definitionen gegen verfügbare Module (Band 12–15).
- `edition-provisioner` Agent: aktiviert/deaktiviert Modul-Agenten pro `TenantEdition`.
- `compliance-auditor` Agent: prüft, dass Edition keine Core-Fork-Duplikate erzeugt.
- Tools in `agentToolDefinition`; Policies begrenzen auf Factory-Scope (kein Fachschreibzugriff).

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- Pack-Catalog: Liste `IndustryPack`s mit aktiven Modul-Badges (Content/Growth/Finance/Infra).
- Edition-Config: Toggle-UI für Module pro Tenant, bindet an `TenantEdition`.
- Activation-Log: chronologische `EditionActivationLog` mit Agent-Run-Referenz.
- Composition-Health: zeigt Metriken aus Observability für aktive Edition-Module.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: `IndustryPack`-Validierung lehnt unbekannte Modul-Keys (außerhalb Band 12–15) ab.
- Integration: Activate→Module-Toggle end-to-end mit Tenant-Kontext; idempotent bei Re-Activate.
- Security: Cross-Tenant-Lesezugriff auf fremde `TenantEdition` → 403.
- Anti-Fork-Test: Architekturtest bestätigt keine duplizierten Engine-Klassen in Editionen.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- `requireApiPermission("factory:read|factory:activate|factory:configure")` auf Endpunkten.
- `IndustryPack`-Konfiguration darf keine Secrets enthalten; nur Modul-Referenzen.
- Logs via `logStructured` mit `correlationId`/`workspaceId`; Redaction aus Observability Pflicht.
- Edition-Wechsel auditierbar (`factory.composition.audited.v1` + DB-Trail).

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `TenantEdition(tenantId)`, `IndustryPack(key, version)`, `EditionActivationLog(tenantId, ts)`.
- Pack-Auflösung gecacht pro `tenantId` (kurzlebig); Invalidierung bei Toggle/Activate.
- Provisioning asynchron via Band-11 Agenten; `optimizationQueueLagSeconds` reuse als p95-Ziel.
- Modul-Metriken aggregiert aus Observability, kein separater Telemetrie-Store.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: KEINE Core-Forks/Second Engines.
7. Composition-Validierung gegen Band 12–15 verifiziert.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
