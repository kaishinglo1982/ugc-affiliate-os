# CarryOS Universe – Band 64
# Masterprompt: Agent Packs (VOLLSTÄNDIG)

> Band: 64 | Masterprompt: 64.0 | Status: PLANNED | Gruppe: Platform
> Abhängigkeit: Band 10–16 (Core), Band 11 (Agentic OS), keine Core-Fork

## Kapitel 1 – Architektur

- Agent Packs liefern gebündelte, versionierte Agenten-Definitionen (`agentPack`) – Persona, Tools, Prompt-Templates, Memory-Scopes – die in die Band 11 Agent Runtime registriert werden; keine zweite Agent Runtime.
- Pack deklariert Agent-Rollen und erlaubte Tool-Capabilities; Binding erfolgt über Core-Service-Registry mit tenantScope.
- Agent Packs sind komponierbar mit Workflow Packs (Band 63): ein Workflow-Step kann einen Pack-Agenten aufrufen.
- Memory-Isolation: jeder Agent hat tenant-gebundene Memory-Partition, keine Cross-Tenant-Memory-Leaks.

## Kapitel 2 – Datenmodelle

- `AgentPack`: packId, version, name, authorId, agents[] (role, tools[], promptRef, memoryScope), dependencies[].
- `AgentPackInstallation`: tenantId, packId, version, config, status, installedBy.
- `AgentInstance`: tenantId, packInstanceId, agentRole, runtimeState, lastHeartbeat.
- `AgentToolGrant`: tenantId, agentRole, toolCapability, scope (Least Privilege).

## Kapitel 3 – APIs

- `GET /api/v1/agent-packs` – Katalog verfügbarer Agent Packs (Public-lesbar).
- `POST /api/v1/agent-packs/:id/install` – Agenten im Tenant registrieren (Band-10-Envelope).
- `POST /api/v1/agent-packs/:id/invoke` – Agent mit tenantContext aufrufen.
- `GET /api/v1/agent-packs/:id/instances` – Instanz-Health pro Tenant.

## Kapitel 4 – Events

- `agent_pack.installed.v1`, `agent_pack.agent_registered.v1`, `agent_pack.invoked.v1`, `agent_pack.tool_denied.v1`.
- Bei Registration `core.agent.registered.v1` an Band 11; Invocation nutzt bestehende Agent-Event-Pipeline.
- Alle Events mit `tenantId`, `packInstanceId`, `agentRole`, `actorId`; versioniert.

## Kapitel 5 – Workflows

- Install-Flow: Manifest-Parse → Tool-Capability-Check (Band 10) → Memory-Scope-Allokation → Band 11 Registration → ExecutionKey → ACTIVE.
- Invoke-Flow: tenantContext → Permission-Check → Agent-Runtime (Band 11) → Tool-Execution (grant-geprüft) → Response → Audit.
- Deny-Flow: Agent fordert nicht gewährte Tool-Capability → `agent_pack.tool_denied.v1`, Invocation abgebrochen.

## Kapitel 6 – Agenten

- `AgentPackValidatorAgent` (Band 11): prüft Prompt-Templates, Tool-Deklarationen, Memory-Scope-Konflikte.
- Pack-Agenten selbst: fachliche Rollen (z. B. "SupportAgent", "SalesAgent") mit definierten Tools.
- `AgentHealthAgent`: Heartbeat-Monitoring, Auto-Restart bei Crash, Isolation-Verletzungs-Erkennung.

## Kapitel 7 – UI

- Agent-Pack-Katalog: Rollen-Übersicht, Tool-Badges, Memory-Scope-Hinweis, Install.
- Agent-Konfigurator: Prompt-Parameter, Tool-Toggles (nur erlaubte Capabilities), Test-Chat.
- Instance-Dashboard: Health, letzte Invocations, Tool-Deny-Log pro Tenant.

## Kapitel 8 – Tests

- Vitest-Unit: Manifest-Parse, Tool-Grant-Resolution, Memory-Scope-Validation, Prompt-Template-Render.
- Integration: Install→Invoke Roundtrip; Tenant A Agent nicht in Tenant B aufrufbar.
- Security-Test: Agent fordert `core.db.write` ohne Grant → `agent_pack.tool_denied.v1`.

## Kapitel 9 – Security

- Agent Packs signiert; Prompt-Templates dürfen keine Secrets/System-Prompts injizieren (Injection-Prüfung).
- Tool-Capabilities strikt via Band 10 Allowlist; Memory-Isolation erzwungen durch tenantId-Partition.
- requireApiPermission auf Install/Invoke; Audit aller Agent-Registrierungen und Denials.

## Kapitel 10 – Performance

- Registration < 100ms (p95) via Lazy-Binding; Invocation-Overhead < 50ms über wiederverwendete Runtime-Contexts.
- Instance-Health polling asynchron (Heartbeat 30s); Indizes auf (tenantId, packInstanceId, agentRole).
- Memory-Partition via Sharding-Key, kein Full-Scan bei Agent-Lookup.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweite Agent-Runtime.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
