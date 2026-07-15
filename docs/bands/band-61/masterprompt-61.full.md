# CarryOS Universe – Band 61
# Masterprompt: Plugin SDK (VOLLSTÄNDIG)

> Band: 61 | Masterprompt: 61.0 | Status: PLANNED | Gruppe: Platform
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

## Kapitel 1 – Architektur

- Das Plugin SDK ist eine typsichere TypeScript-Bibliothek (`@carryos/plugin-sdk`), die gegen die Band-16 Industry Solution Factory als Extension-Point registriert wird – kein Fork des Cores, sondern deklarative Plugin-Manifeste (`plugin.manifest.ts`).
- SDK stellt Extension-Hooks bereit: `registerRoute`, `registerAgent`, `registerWorkflow`, `registerEntity`, `registerUIWidget` – alle laufen im isolierten Plugin-Sandbox-Context mit eigenem tenantScope.
- Plugin-Code wird über die bestehende Agent Runtime (Band 11) und EventBus (Band 10) gebunden; das SDK darf keine eigene Runtime, Queue oder Engine starten.
- Dependency-Injection erfolgt über das Core-Service-Registry; Plugins erhalten nur Capability-Tokens, niemals direkten DB-Zugriff.

## Kapitel 2 – Datenmodelle

- `PluginManifest`: id, version, name, authorId, tenantScope, capabilities[], hooks[], checksum (SHA-256).
- `PluginInstallation`: tenantId, pluginId, version, status (PENDING|ACTIVE|DISABLED|FAILED), config (Zod-validiert), installedBy, installedAt.
- `PluginCapabilityGrant`: tenantId, pluginId, capability, scope, expiresAt – steuert minimale Rechte (Least Privilege).
- Alle Tabellen tragen `tenantId` als Partition-Key; keine Plugin-Entität ohne tenantIsolation-Filter.

## Kapitel 3 – APIs

- `POST /api/v1/plugins/install` – Manifest hochladen + Zod-Validierung der Capabilities (Band-10-Envelope).
- `GET /api/v1/plugins` – installierte Plugins eines Tenants (withApiContext + requireApiPermission).
- `POST /api/v1/plugins/:id/activate|deactivate` – Statuswechsel mit Audit-Event.
- `GET /api/v1/plugins/sdk/types` – generierte SDK-Type-Definitionen für den Plugin-Entwickler.

## Kapitel 4 – Events

- `plugin.installed.v1`, `plugin.activated.v1`, `plugin.deactivated.v1`, `plugin.capability_rejected.v1` über bestehende Outbox.
- Bei Activation wird `core.extension.registered.v1` an Band 11/16 gefeuert, damit Runtime den Hook bindet.
- Jedes Event trägt `tenantId`, `pluginId`, `actorId` und versioniertes Schema für Replay-Sicherheit.

## Kapitel 5 – Workflows

- Install-Flow: Upload → Manifest-Parse → Capability-Check (Band 10) → Sandbox-Signature → ExecutionKey (idempotent) → DB-Persist → Activate-Event.
- Deactivate-Flow: Hook-Deregistrierung in Band 16 → laufende Jobs beenden → Status DISABLED → Audit.
- Rollback bei Signatur-/Capability-Verletzung: Transactional, kein Partial-State, Fehler → `plugin.install_failed.v1`.

## Kapitel 6 – Agenten

- `PluginValidatorAgent` prüft Manifeste gegen Capability-Allowlist und Sandbox-Regeln (läuft in Band 11 Runtime).
- `PluginLifecycleAgent` steuert Activate/Deactivate und überwacht Plugin-Health-Heartbeats.
- Plugin-eigene Agenten werden nur im Plugin-tenantScope ausgeführt, nie mit Core-Agent-Rechten.

## Kapitel 7 – UI

- Plugin-Manager-Dashboard: Liste, Status, Capability-Matrix, Activate/Deactivate, Config-Form (Zod-Schema driven).
- SDK-Playground mit Live-Type-Completion und Manifest-Previewer im Developer-Portal.
- Keine Fachlogik in Client-Komponenten; alle Schreiboperationen via Band-10-Envelope-APIs.

## Kapitel 8 – Tests

- Vitest-Unit: Manifest-Parser, Capability-Allowlist, Checksum-Validation, Zod-Schemas.
- Integration: Install→Activate→Deactivate Roundtrip mit tenantIsolation-Assertion (Tenant A sieht nicht Tenant B Plugins).
- Security-Test: Plugin fordert `core.db.admin` → muss `plugin.capability_rejected.v1` auslösen.

## Kapitel 9 – Security

- Sandbox über Core-Service-Registry mit Capability-Token; niemals direkter DB/FS-Zugriff durch Plugin.
- Signierte Manifeste (Ed25519), Checksum-Whitelist, Least-Privilege-Grants pro Tenant.
- requireApiPermission auf allen Plugin-Admin-APIs; Audit-Log für jede Installation/Activation.

## Kapitel 10 – Performance

- Manifest-Validation < 50ms (p95), Activation < 200ms durch Lazy-Hook-Binding.
- Plugin-Liste paginiert + gecached pro Tenant (TTL 60s); Indizes auf (tenantId, pluginId).
- Sandbox-Overhead via vorgefertigte Context-Pools, kein per-Request Process-Spawn.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines/Runtime.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
